import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertStripeSettingsDto } from './dto/upsert-stripe-settings.dto';

export interface CheckoutLinkResult {
    id: string;
    url: string;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    // =========================================================================
    // ACCESS HELPERS
    // =========================================================================

    private assertSettingsRole(actor: User): void {
        const allowed: UserRole[] = [
            UserRole.SUPER_ADMIN,
            UserRole.OWNER,
            UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new ForbiddenException(
                'Only SUPER_ADMIN, OWNER, or RESTAURANT_ADMIN can manage Stripe settings',
            );
        }
    }

    // =========================================================================
    // SETTINGS CRUD
    // =========================================================================

    /**
     * Fetch Stripe settings for a restaurant.
     * The secret key is masked in the response (only last 4 chars exposed).
     */
    async getSettings(actor: User, restaurantId: string) {
        this.assertSettingsRole(actor);

        const settings = await this.prisma.stripeSettings.findUnique({
            where: { restaurantId },
        });

        if (!settings) {
            return null;
        }

        return this.maskSettings(settings);
    }

    /** Create or update Stripe settings for a restaurant. */
    async upsertSettings(
        actor: User,
        restaurantId: string,
        dto: UpsertStripeSettingsDto,
    ) {
        this.assertSettingsRole(actor);

        // Ensure the restaurant exists
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true },
        });
        if (!restaurant) {
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);
        }

        const settings = await this.prisma.stripeSettings.upsert({
            where: { restaurantId },
            create: {
                restaurantId,
                secretKey: dto.secretKey,
                publishableKey: dto.publishableKey ?? null,
                webhookSecret: dto.webhookSecret ?? null,
                currency: dto.currency ?? 'usd',
                isActive: dto.isActive ?? true,
            },
            update: {
                secretKey: dto.secretKey,
                publishableKey: dto.publishableKey ?? null,
                webhookSecret: dto.webhookSecret !== undefined ? dto.webhookSecret : undefined,
                currency: dto.currency ?? undefined,
                isActive: dto.isActive ?? undefined,
            },
        });

        this.logger.log(`Stripe settings upserted for restaurant ${restaurantId} by ${actor.name}`);

        return this.maskSettings(settings);
    }

    /** Remove Stripe settings for a restaurant. */
    async deleteSettings(actor: User, restaurantId: string) {
        this.assertSettingsRole(actor);

        const existing = await this.prisma.stripeSettings.findUnique({
            where: { restaurantId },
        });

        if (!existing) {
            throw new NotFoundException(
                `No Stripe settings found for restaurant ${restaurantId}`,
            );
        }

        await this.prisma.stripeSettings.delete({ where: { restaurantId } });

        this.logger.log(`Stripe settings deleted for restaurant ${restaurantId} by ${actor.name}`);

        return { message: 'Stripe settings removed successfully' };
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    /**
     * Fetch raw settings (including secret key) for internal use by checkout/webhook.
     * Never expose the result of this directly to API consumers.
     */
    async getRawSettings(restaurantId: string) {
        return this.prisma.stripeSettings.findUnique({
            where: { restaurantId },
        });
    }

    /**
     * Resolve the secret key for a given restaurant.
     * Falls back to STRIPE_SECRET_KEY env var for backward compat.
     */
    async resolveSecretKey(restaurantId: string): Promise<string> {
        const settings = await this.getRawSettings(restaurantId);
        if (settings?.secretKey) {
            return settings.secretKey;
        }

        // Global fallback (backward compat / non-Stripe-configured restaurants)
        const envKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (envKey) {
            return envKey;
        }

        throw new NotFoundException(
            `No Stripe configuration found for restaurant ${restaurantId}. ` +
            'Please configure Stripe settings via PUT /restaurants/:id/stripe/settings',
        );
    }

    /**
     * Resolve the webhook secret for a given restaurant.
     * Falls back to STRIPE_WEBHOOK_SECRET env var.
     */
    async resolveWebhookSecret(restaurantId: string): Promise<string | null> {
        const settings = await this.getRawSettings(restaurantId);
        if (settings?.webhookSecret) {
            return settings.webhookSecret;
        }
        return this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? null;
    }

    /** Mask the secret key so only the last 4 chars are shown. */
    private maskSettings(settings: {
        id: string;
        restaurantId: string;
        secretKey: string;
        publishableKey: string | null;
        webhookSecret: string | null;
        currency: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }) {
        return {
            ...settings,
            secretKey: `****${settings.secretKey.slice(-4)}`,
            webhookSecret: settings.webhookSecret
                ? `****${settings.webhookSecret.slice(-4)}`
                : null,
        };
    }

    // =========================================================================
    // CHECKOUT SESSION CREATION
    // =========================================================================

    async createCheckoutLinkForBooking(
        booking: { restaurantId: string; cartId: string },
        payment: {
            amount: number | string;
            currency?: string | null;
            subtotal: number | string;
            discountAmount: number | string;
            deliveryCharge?: number | null;
            customerName?: string | null;
            customerPhone?: string | null;
            customerEmail?: string | null;
            deliveryAddress?: string | null;
            specialInstructions?: string | null;
        },
        userEmail: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<CheckoutLinkResult> {
        // ── Resolve per-restaurant secret key ───────────────────────────────
        const secretKey = await this.resolveSecretKey(booking.restaurantId);

        // ── Resolve currency (dto > restaurant settings > default "usd") ────
        const rawSettings = await this.getRawSettings(booking.restaurantId);
        const currency = (
            payment.currency ||
            rawSettings?.currency ||
            'usd'
        ).toLowerCase();

        const unitAmount = Math.round(Number(payment.amount) * 100);

        if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
            throw new Error(`Invalid payment amount: ${payment.amount}`);
        }

        const body = new URLSearchParams();
        body.append('mode', 'payment');
        body.append('customer_email', userEmail);
        body.append('success_url', `${successUrl}?session_id={CHECKOUT_SESSION_ID}&cart_id=${booking.cartId}`);
        body.append('cancel_url', `${cancelUrl}?cart_id=${booking.cartId}`);
        body.append('payment_method_types[0]', 'card');
        body.append('line_items[0][quantity]', '1');
        body.append('line_items[0][price_data][currency]', currency);
        body.append('line_items[0][price_data][unit_amount]', String(unitAmount));
        body.append('line_items[0][price_data][product_data][name]', 'Online Order Payment');
        body.append('line_items[0][price_data][product_data][description]', `Cart Payment: ${booking.cartId}`);

        body.append('metadata[purpose]', 'restaurant_order_booking');
        body.append('metadata[restaurantId]', booking.restaurantId);
        body.append('metadata[cartId]', booking.cartId);
        body.append('metadata[subtotal]', String(payment.subtotal));
        body.append('metadata[discountAmount]', String(payment.discountAmount));
        body.append('metadata[totalAmount]', String(payment.amount));
        if (payment.customerName) body.append('metadata[customerName]', payment.customerName);
        if (payment.customerPhone) body.append('metadata[customerPhone]', payment.customerPhone);
        if (payment.customerEmail) body.append('metadata[customerEmail]', payment.customerEmail);
        if (payment.deliveryAddress) body.append('metadata[deliveryAddress]', payment.deliveryAddress);
        if (payment.specialInstructions) body.append('metadata[specialInstructions]', payment.specialInstructions);
        if (payment.deliveryCharge != null && payment.deliveryCharge > 0) {
            body.append('metadata[deliveryCharge]', String(payment.deliveryCharge));
        }

        body.append('payment_intent_data[metadata][purpose]', 'restaurant_order_booking');
        body.append('payment_intent_data[metadata][restaurantId]', booking.restaurantId);
        body.append('payment_intent_data[metadata][cartId]', booking.cartId);
        body.append('payment_intent_data[metadata][subtotal]', String(payment.subtotal));
        body.append('payment_intent_data[metadata][discountAmount]', String(payment.discountAmount));
        body.append('payment_intent_data[metadata][totalAmount]', String(payment.amount));
        if (payment.customerName) body.append('payment_intent_data[metadata][customerName]', payment.customerName);
        if (payment.customerPhone) body.append('payment_intent_data[metadata][customerPhone]', payment.customerPhone);
        if (payment.customerEmail) body.append('payment_intent_data[metadata][customerEmail]', payment.customerEmail);
        if (payment.deliveryAddress) body.append('payment_intent_data[metadata][deliveryAddress]', payment.deliveryAddress);
        if (payment.specialInstructions) body.append('payment_intent_data[metadata][specialInstructions]', payment.specialInstructions);
        if (payment.deliveryCharge != null && payment.deliveryCharge > 0) {
            body.append('payment_intent_data[metadata][deliveryCharge]', String(payment.deliveryCharge));
        }

        const response = await axios.post(
            'https://api.stripe.com/v1/checkout/sessions',
            body.toString(),
            {
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );

        const sessionId = response.data?.id as string | undefined;
        const url = response.data?.url as string | undefined;

        if (!sessionId || !url) {
            throw new Error('Stripe did not return a checkout session URL');
        }

        this.logger.log(
            `Checkout session created | restaurant=${booking.restaurantId} | cart=${booking.cartId} | session=${sessionId}`,
        );

        return { id: sessionId, url };
    }
}