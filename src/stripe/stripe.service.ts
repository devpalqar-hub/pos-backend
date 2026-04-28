import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CheckoutLinkResult {
    id: string;
    url: string;
}

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly stripeSecretKey: string;

    constructor(private readonly configService: ConfigService) {
        const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY is not configured');
        }

        this.stripeSecretKey = stripeSecretKey;
    }

    async createCheckoutLinkForBooking(
        booking: { restaurantId: string; cartId: string },
        payment: {
            amount: number | string;
            currency?: string;
            subtotal: number | string;
            discountAmount: number | string;
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
        body.append('line_items[0][price_data][currency]', (payment.currency || 'inr').toLowerCase());
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

        const response = await axios.post('https://api.stripe.com/v1/checkout/sessions', body.toString(), {
            headers: {
                Authorization: `Bearer ${this.stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const sessionId = response.data?.id as string | undefined;
        const url = response.data?.url as string | undefined;

        if (!sessionId || !url) {
            throw new Error('Stripe did not return a checkout session URL');
        }

        this.logger.log(`Checkout session created | cart=${booking.cartId} | session=${sessionId}`);

        return { id: sessionId, url };
    }
}