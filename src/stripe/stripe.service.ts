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
    booking: { id: string; restaurantId: string },
    payment: {
      id: string;
      billId: string;
      amount: number | string;
      currency?: string;
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
    body.append('success_url', `${successUrl}?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`);
    body.append('cancel_url', `${cancelUrl}?booking_id=${booking.id}`);
    body.append('payment_method_types[0]', 'card');
    body.append('line_items[0][quantity]', '1');
    body.append('line_items[0][price_data][currency]', (payment.currency || 'inr').toLowerCase());
    body.append('line_items[0][price_data][unit_amount]', String(unitAmount));
    body.append('line_items[0][price_data][product_data][name]', 'Online Order Payment');
    body.append('line_items[0][price_data][product_data][description]', `Order Session: ${booking.id}`);

    body.append('metadata[purpose]', 'restaurant_order_booking');
    body.append('metadata[bookingId]', booking.id);
    body.append('metadata[orderSessionId]', booking.id);
    body.append('metadata[restaurantId]', booking.restaurantId);
    body.append('metadata[billId]', payment.billId);
    body.append('metadata[paymentId]', payment.id);

    body.append('payment_intent_data[metadata][purpose]', 'restaurant_order_booking');
    body.append('payment_intent_data[metadata][bookingId]', booking.id);
    body.append('payment_intent_data[metadata][orderSessionId]', booking.id);
    body.append('payment_intent_data[metadata][restaurantId]', booking.restaurantId);
    body.append('payment_intent_data[metadata][billId]', payment.billId);
    body.append('payment_intent_data[metadata][paymentId]', payment.id);

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

    this.logger.log(`Checkout session created | booking=${booking.id} | payment=${payment.id} | session=${sessionId}`);

    return { id: sessionId, url };
  }
}