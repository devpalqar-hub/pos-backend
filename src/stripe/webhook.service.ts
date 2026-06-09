import { BadRequestException, Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { BatchStatus, BillStatus, OrderChannel, OrderItemStatus, PaymentMethod, PaymentStatus, SessionStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { DoorDashService } from '../doordash/doordash.service';
import { StripeService } from './stripe.service';

type StripeWebhookEvent = {
    id: string;
    type: string;
    data: {
        object: Record<string, any>;
    };
};

// ─── Enriched batch include ───────────────────────────────────────────────────
// Includes table name, customer name, and session number so the kitchen display
// has all context needed without making secondary requests.
const KITCHEN_BATCH_INCLUDE = {
    items: {
        include: {
            menuItem: { select: { id: true, name: true, imageUrl: true } },
        },
    },
    createdBy: { select: { id: true, name: true, role: true } },
    session: {
        select: {
            id: true,
            sessionNumber: true,
            tableId: true,
            restaurantId: true,
            customerName: true,
            channel: true,
            table: { select: { id: true, name: true } },
        },
    },
} as const;

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly gateway: OrdersGateway,
        private readonly stripeService: StripeService,
        @Inject(forwardRef(() => DoorDashService))
        private readonly doorDashService: DoorDashService,
    ) { }

    private async generateSessionNumber(restaurantId: string) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const exists = await this.prisma.orderSession.findFirst({
            where: {
                restaurantId,
                sessionNumber: code,
            },
        });

        if (exists) {
            return this.generateSessionNumber(restaurantId);
        }

        return code;
    }

    private async generateBatchNumber(sessionId: string) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const exists = await this.prisma.orderBatch.findFirst({
            where: {
                sessionId,
                batchNumber: code,
            },
        });

        if (exists) {
            return this.generateBatchNumber(sessionId);
        }

        return code;
    }

    private async generateBillNumber(restaurantId: string) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const exists = await this.prisma.bill.findFirst({
            where: {
                restaurantId,
                billNumber: code,
            },
        });

        if (exists) {
            return this.generateBillNumber(restaurantId);
        }

        return code;
    }

    private parseMetadataNumber(value: unknown, fallback: number): number {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    // =========================================================================
    // WEBHOOK SIGNATURE VERIFICATION
    // =========================================================================

    /**
     * Verify the Stripe webhook signature.
     *
     * Strategy — per-restaurant webhook secret with global fallback:
     *  1. Parse the event body first to extract `restaurantId` from metadata.
     *  2. Look up the restaurant's `webhookSecret` from `StripeSettings`.
     *  3. If found, verify with the restaurant-specific secret.
     *  4. If not found, fall back to the global `STRIPE_WEBHOOK_SECRET` env var.
     *
     * This means each restaurant can register its own Stripe webhook endpoint
     * with a unique secret, and the system will verify accordingly.
     */
    async verifyWebhookSignature(body: Buffer, signature: string, pathRestaurantId?: string): Promise<StripeWebhookEvent> {
        const parsed = this.parseStripeSignature(signature);
        if (!parsed.timestamp || !parsed.signatures.length) {
            throw new BadRequestException('Invalid Stripe webhook signature header');
        }

        // Parse the raw body to extract restaurantId from metadata
        let event: StripeWebhookEvent;
        try {
            event = JSON.parse(body.toString('utf8')) as StripeWebhookEvent;
        } catch {
            throw new BadRequestException('Invalid JSON in webhook body');
        }

        // Use the ID from the URL path first, fallback to the one in metadata
        const restaurantId: string | undefined = pathRestaurantId || event.data?.object?.metadata?.restaurantId;

        // Collect candidate secrets to try
        const candidateSecrets: string[] = [];

        if (restaurantId) {
            const restaurantSecret = await this.stripeService.resolveWebhookSecret(restaurantId);
            if (restaurantSecret) candidateSecrets.push(restaurantSecret);
        } else {
            // No restaurantId in metadata — try all restaurant webhook secrets
            const allSettings = await this.prisma.stripeSettings.findMany({
                where: { webhookSecret: { not: null } },
                select: { webhookSecret: true },
            });
            candidateSecrets.push(...allSettings.map(s => s.webhookSecret!));

            // Also try global fallback
            const globalSecret = await this.stripeService.resolveWebhookSecret('');
            if (globalSecret) candidateSecrets.push(globalSecret);
        }

        if (candidateSecrets.length === 0) {
            throw new BadRequestException(
                'No Stripe webhook secret configured. ' +
                'Set STRIPE_WEBHOOK_SECRET env var or configure per-restaurant webhookSecret.',
            );
        }

        const payloadToSign = `${parsed.timestamp}.${body.toString('utf8')}`;

        const isValid = candidateSecrets.some(secret => {
            const expected = createHmac('sha256', secret)
                .update(payloadToSign, 'utf8')
                .digest('hex');
            return parsed.signatures.some(sig => this.safeCompare(sig, expected));
        });

        if (!isValid) {
            throw new BadRequestException('Invalid Stripe webhook signature');
        }

        return event;
    }

    async processWebhookEvent(event: StripeWebhookEvent) {
        switch (event.type) {
            case 'checkout.session.completed':
                return this.handleCheckoutSessionCompleted(event.data.object);
            case 'checkout.session.expired':
                return this.handleCheckoutSessionExpired(event.data.object);
            case 'payment_intent.payment_failed':
                return this.handlePaymentIntentFailed(event.data.object);
            default:
                this.logger.warn(`Unhandled Stripe event: ${event.type}`);
                return { received: true };
        }
    }

    // =========================================================================
    // EVENT HANDLERS
    // =========================================================================

    private async handleCheckoutSessionCompleted(session: Record<string, any>) {
        if (session?.metadata?.purpose !== 'restaurant_order_booking') {
            return { received: true };
        }

        if (session.payment_status !== 'paid') {
            this.logger.warn(`Checkout session completed but not paid | session=${session.id}`);
            return { received: true };
        }

        const metadata = session.metadata || {};
        const restaurantId = metadata.restaurantId;
        const cartId = metadata.cartId;

        if (!restaurantId || !cartId) {
            this.logger.error(`Missing booking metadata | session=${session.id}`);
            return { received: true };
        }

        const existingOrder = await this.prisma.orderSession.findFirst({
            where: {
                restaurantId,
                externalOrderId: session.id,
            },
        });

        if (existingOrder) {
            this.logger.warn(`Checkout session already processed | session=${session.id}`);
            return { received: true };
        }

        const cart = await this.prisma.cart.findFirst({
            where: { id: cartId, restaurantId },
            include: {
                items: {
                    include: {
                        menuItem: { select: { id: true, name: true, imageUrl: true } },
                    },
                },
                customer: {
                    select: { id: true, name: true, email: true, phone: true },
                },
            },
        });

        if (!cart || cart.items.length === 0) {
            this.logger.error(`Cart not found or empty for paid checkout session ${session.id}`);
            return { received: true };
        }

        const subtotal = this.parseMetadataNumber(
            metadata.subtotal,
            cart.items.reduce((sum, item) => sum + Number(item.total), 0),
        );
        const discountAmount = this.parseMetadataNumber(metadata.discountAmount, 0);
        const totalAmount = this.parseMetadataNumber(
            metadata.totalAmount,
            Math.max(subtotal - discountAmount, 0),
        );

        const customerName = metadata.customerName || cart.customer?.name || null;
        const customerPhone = metadata.customerPhone || cart.customer?.phone || null;
        const customerEmail = metadata.customerEmail || cart.customer?.email || null;
        const deliveryAddress = metadata.deliveryAddress || null;
        const specialInstructions = metadata.specialInstructions || null;
        const deliveryCharge = this.parseMetadataNumber(metadata.deliveryCharge, 0);
        const paymentIntentId =
            typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id;

        const created = await this.prisma.$transaction(async (tx) => {
            const sessionNumber = await this.generateSessionNumber(restaurantId);

            const orderSession = await tx.orderSession.create({
                data: {
                    restaurantId,
                    sessionNumber,
                    channel: OrderChannel.ONLINE_OWN,
                    status: SessionStatus.OPEN,
                    customerId: cart.customerId ?? null,
                    externalOrderId: session.id,
                    customerName,
                    customerPhone,
                    customerEmail,
                    deliveryAddress,
                    specialInstructions,
                    subtotal,
                    discountAmount,
                    totalAmount,
                    deliveryFee: deliveryCharge > 0 ? deliveryCharge : null,
                },
            });

            await tx.orderSessionUpdateTime.create({
                data: {
                    orderSessionId: orderSession.id,
                    updatedAt: orderSession.createdAt,
                    fieldChanged: 'status',
                    oldValue: null,
                    newValue: SessionStatus.OPEN,
                },
            });

            const batchNumber = await this.generateBatchNumber(orderSession.id);

            const batch = await tx.orderBatch.create({
                data: {
                    sessionId: orderSession.id,
                    batchNumber,
                    status: BatchStatus.PENDING,
                    customerId: cart.customerId ?? null,
                    items: {
                        create: cart.items.map((item) => ({
                            menuItemId: item.menuItemId,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            totalPrice: item.total,
                            status: OrderItemStatus.PENDING,
                        })),
                    },
                },
                include: KITCHEN_BATCH_INCLUDE,
            });

            const billNumber = await this.generateBillNumber(restaurantId);

            const bill = await tx.bill.create({
                data: {
                    sessionId: orderSession.id,
                    restaurantId,
                    billNumber,
                    status: BillStatus.PAID,
                    subtotal,
                    grossAmount: subtotal,
                    taxRate: 0,
                    taxAmount: 0,
                    discountAmount,
                    totalAmount,
                    customerName,
                    customerPhone,
                    customerEmail,
                    paidAt: new Date(),
                    customerId: cart.customerId ?? null,
                },
            });

            await tx.billItem.createMany({
                data: cart.items.map((item) => ({
                    billId: bill.id,
                    menuItemId: item.menuItemId,
                    name: item.menuItem.name,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    totalPrice: item.total,
                })),
            });

            const payment = await tx.payment.create({
                data: {
                    billId: bill.id,
                    amount: totalAmount,
                    method: PaymentMethod.ONLINE,
                    status: PaymentStatus.SUCCESS,
                    reference: paymentIntentId ?? session.id,
                    paymentIntentId: paymentIntentId ?? null,
                    checkoutSessionId: session.id,
                    paidAt: new Date(),
                    notes: 'STRIPE_CHECKOUT_PAID',
                },
            });

            await tx.cartItem.deleteMany({
                where: { cartId },
            });

            return { orderSession, batch, bill, payment };
        });

        this.gateway.emitToRestaurant(restaurantId, 'session:opened', created.orderSession);
        // Emit enriched batch with session info (sessionNumber, customerName, table) to kitchen
        this.gateway.emitToKitchen(restaurantId, 'batch:created', created.batch);
        this.gateway.emitToRestaurant(restaurantId, 'batch:created', created.batch);
        this.gateway.emitToBilling(restaurantId, 'bill:generated', created.bill);
        this.gateway.emitToBilling(restaurantId, 'payment:recorded', {
            billId: created.bill.id,
            paymentId: created.payment.id,
            method: 'ONLINE',
        });
        this.gateway.emitToBilling(restaurantId, 'bill:paid', { billId: created.bill.id });

        // Fire-and-forget DoorDash Drive dispatch for ONLINE_OWN delivery orders
        if (deliveryCharge > 0) {
            void this.doorDashService.tryDispatchDriveDelivery(restaurantId, created.orderSession.id);
        }

        return { received: true };
    }

    private async handleCheckoutSessionExpired(session: Record<string, any>) {
        if (session?.metadata?.purpose !== 'restaurant_order_booking') {
            return { received: true };
        }

        this.logger.warn(`Checkout session expired for booking cart=${session?.metadata?.cartId ?? 'unknown'}`);
        return { received: true };
    }

    private async handlePaymentIntentFailed(paymentIntent: Record<string, any>) {
        if (paymentIntent?.metadata?.purpose !== 'restaurant_order_booking') {
            return { received: true };
        }

        const reason = paymentIntent.last_payment_error?.message || 'Payment failed';
        this.logger.warn(
            `Stripe payment failed for booking cart=${paymentIntent?.metadata?.cartId ?? 'unknown'} | reason=${reason}`,
        );
        return { received: true };
    }

    // =========================================================================
    // SIGNATURE HELPERS
    // =========================================================================

    private parseStripeSignature(headerValue: string): { timestamp?: string; signatures: string[] } {
        const result: { timestamp?: string; signatures: string[] } = { signatures: [] };

        for (const part of headerValue.split(',')) {
            const [key, value] = part.split('=', 2);
            if (key === 't') {
                result.timestamp = value;
            } else if (key === 'v1' && value) {
                result.signatures.push(value);
            }
        }

        return result;
    }

    private safeCompare(left: string, right: string): boolean {
        const leftBuffer = Buffer.from(left, 'utf8');
        const rightBuffer = Buffer.from(right, 'utf8');

        if (leftBuffer.length !== rightBuffer.length) {
            return false;
        }

        return timingSafeEqual(leftBuffer, rightBuffer);
    }
}