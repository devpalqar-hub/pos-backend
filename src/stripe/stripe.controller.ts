import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Get,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { WebhookService } from './webhook.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Stripe Payment')
@Controller({
  path: 'stripe',
})
export class StripeController {
  constructor(private readonly webhookService: WebhookService) { }

  @ApiOperation({
    summary: 'Test Stripe webhook endpoint',
    description: 'Health check endpoint for Stripe webhook configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook endpoint is active',
    schema: {
      example: {
        ok: true,
      },
    },
  })
  @Get('webhook')
  testWebhook() {
    return { ok: true };
  }

  @ApiOperation({
    summary: 'Handle Stripe webhook events',
    description:
      'Webhook endpoint for processing Stripe events (payment_intent.succeeded, charge.refunded, customer.subscription.updated, etc.). \n\n' +
      'IMPORTANT: This endpoint receives raw buffer data and should not be accessible via Swagger UI.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      example: {
        received: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid signature or missing stripe-signature header',
  })
  @ApiResponse({
    status: 500,
    description: 'Error processing webhook event',
  })
  /**
   * Stripe Webhook Endpoint
   * IMPORTANT:
   * - Raw body must be enabled in main.ts
   * - No JSON parsing here
   */
  @Post('webhook')
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .send('Missing stripe-signature header');
    }

    try {
      // ✅ USE req.body (Buffer)
      const event = this.webhookService.verifyWebhookSignature(
        req.body as Buffer,
        signature,
      );

      await this.webhookService.processWebhookEvent(event);

      return res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return res.status(HttpStatus.BAD_REQUEST).send(errorMessage);
    }
  }
}
