import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillStatus, PaymentStatus, SessionStatus } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersGateway } from '../orders/orders.gateway';

type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
};

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly gateway: OrdersGateway,
  ) {}

  verifyWebhookSignature(body: Buffer, signature: string): StripeWebhookEvent {
    const endpointSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    const parsed = this.parseStripeSignature(signature);
    if (!parsed.timestamp || !parsed.signatures.length) {
      throw new BadRequestException('Invalid Stripe webhook signature header');
    }

    const payloadToSign = `${parsed.timestamp}.${body.toString('utf8')}`;
    const expectedSignature = createHmac('sha256', endpointSecret)
      .update(payloadToSign, 'utf8')
      .digest('hex');

    const isValid = parsed.signatures.some((candidate) => this.safeCompare(candidate, expectedSignature));

    if (!isValid) {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    return JSON.parse(body.toString('utf8')) as StripeWebhookEvent;
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

  private async handleCheckoutSessionCompleted(session: Record<string, any>) {
    if (session?.metadata?.purpose !== 'restaurant_order_booking') {
      return { received: true };
    }

    if (session.payment_status !== 'paid') {
      this.logger.warn(`Checkout session completed but not paid | session=${session.id}`);
      return { received: true };
    }

    const { paymentId, billId, orderSessionId, restaurantId } = session.metadata || {};
    if (!paymentId || !billId || !orderSessionId || !restaurantId) {
      this.logger.error(`Missing booking payment metadata | session=${session.id}`);
      return { received: true };
    }

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          paymentIntentId: paymentIntentId ?? null,
          checkoutSessionId: session.id,
          reference: paymentIntentId ?? session.id,
          paidAt: new Date(),
          failureReason: null,
          notes: 'STRIPE_CHECKOUT_PAID',
        },
      });

      await tx.bill.updateMany({
        where: { id: billId, status: { not: BillStatus.PAID } },
        data: {
          status: BillStatus.PAID,
          paidAt: new Date(),
        },
      });

      await tx.orderSession.updateMany({
        where: { id: orderSessionId, status: { not: SessionStatus.PAID } },
        data: {
          status: SessionStatus.PAID,
          closedAt: new Date(),
        },
      });
    });

    this.gateway.emitToBilling(restaurantId, 'payment:recorded', {
      billId,
      paymentId,
      method: 'ONLINE',
    });
    this.gateway.emitToBilling(restaurantId, 'bill:paid', { billId });

    return { received: true };
  }

  private async handleCheckoutSessionExpired(session: Record<string, any>) {
    if (session?.metadata?.purpose !== 'restaurant_order_booking') {
      return { received: true };
    }

    const { paymentId, billId, orderSessionId, restaurantId } = session.metadata || {};
    if (!paymentId || !billId || !orderSessionId) {
      return { received: true };
    }

    await this.markPaymentFailed(paymentId, billId, orderSessionId, 'Checkout session expired');

    if (restaurantId) {
      this.gateway.emitToBilling(restaurantId, 'payment:failed', {
        billId,
        paymentId,
        reason: 'Checkout session expired',
      });
    }

    return { received: true };
  }

  private async handlePaymentIntentFailed(paymentIntent: Record<string, any>) {
    if (paymentIntent?.metadata?.purpose !== 'restaurant_order_booking') {
      return { received: true };
    }

    const { paymentId, billId, orderSessionId, restaurantId } = paymentIntent.metadata || {};
    if (!paymentId || !billId || !orderSessionId) {
      return { received: true };
    }

    const reason = paymentIntent.last_payment_error?.message || 'Payment failed';
    await this.markPaymentFailed(paymentId, billId, orderSessionId, reason, paymentIntent.id);

    if (restaurantId) {
      this.gateway.emitToBilling(restaurantId, 'payment:failed', {
        billId,
        paymentId,
        reason,
      });
    }

    return { received: true };
  }

  private async markPaymentFailed(
    paymentId: string,
    billId: string,
    orderSessionId: string,
    reason: string,
    paymentIntentId?: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          paymentIntentId: paymentIntentId ?? null,
          failureReason: reason,
          notes: `STRIPE_CHECKOUT_FAILED: ${reason}`,
        },
      });

      await tx.bill.updateMany({
        where: { id: billId, status: { not: BillStatus.PAID } },
        data: { status: BillStatus.FINAL },
      });

      await tx.orderSession.updateMany({
        where: { id: orderSessionId, status: { not: SessionStatus.PAID } },
        data: { status: SessionStatus.BILLED },
      });
    });
  }

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