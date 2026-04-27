# Stripe Webhook Integration

## Overview

This module provides comprehensive Stripe webhook integration for the Magnolia Touch Backend, handling payment events for both product orders and memorial service bookings.

## Environment Variables

### Required Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_API_KEY=sk_test_...    # Alternative name for secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret from Stripe dashboard

# Database Configuration
DATABASE_URL=mysql://user:password@localhost:3306/magnolia_db
```

### Optional Webhook Configuration

```bash
# Webhook Retry Configuration (defaults shown)
WEBHOOK_MAX_RETRIES=3                    # Maximum retry attempts
WEBHOOK_BASE_DELAY_MS=5000              # Base delay between retries (5 seconds)
WEBHOOK_MAX_DELAY_MS=300000             # Maximum delay (5 minutes)
WEBHOOK_EXPONENTIAL_BACKOFF=true        # Use exponential backoff
```

## Webhook Events Handled

### Payment Events
- `payment_intent.succeeded` - Updates order/booking status to confirmed
- `payment_intent.payment_failed` - Cancels orders and bookings
- `payment_intent.canceled` - Handles user-cancelled payments

### Subscription Events (for recurring services)
- `invoice.payment_succeeded` - Processes recurring subscription payments
- `invoice.payment_failed` - Handles failed subscription renewals
- `customer.subscription.created` - Sets up new subscription services
- `customer.subscription.updated` - Handles plan changes
- `customer.subscription.deleted` - Processes subscription cancellations

### Dispute Events
- `charge.dispute.created` - Logs disputes for administrative review

## Setup Instructions

### 1. Stripe Dashboard Configuration

1. Go to your Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-domain.com/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.dispute.created`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.*`
5. Copy the webhook signing secret and add to environment variables

### 2. Environment Configuration

Add the required environment variables to your `.env` file:

```bash
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_signing_secret
```

### 3. Body Parser Configuration

The webhook endpoint requires raw body parsing for signature verification. This is already configured in `main.ts`:

```typescript
app.use('/stripe/webhook', bodyParser.raw({ type: 'application/json' }));
```

## Architecture

### Key Components

1. **StripeController** - Handles webhook endpoint (`/stripe/webhook`)
2. **StripeService** - Main service for payment intent creation and webhook routing
3. **WebhookService** - Core webhook event processing logic
4. **WebhookErrorHandlerService** - Error handling, retries, and logging

### Data Flow

1. Stripe sends webhook event to `/stripe/webhook`
2. Signature verification ensures request authenticity
3. Event is routed to appropriate handler based on type
4. Database is updated (orders, bookings, etc.)
5. Success/failure response returned to Stripe
6. Comprehensive logging for audit and debugging

### Error Handling

- **Signature Verification**: Invalid signatures are rejected immediately
- **Retry Logic**: Failed webhooks are retried with exponential backoff
- **Critical Alerts**: Payment-related failures trigger administrative notifications
- **Data Validation**: Event data is validated before processing
- **Idempotency**: Webhook events are processed safely even if delivered multiple times

## Payment Intent Metadata

The system uses Stripe PaymentIntent metadata to link payments to orders and bookings:

### Product Orders
```typescript
{
  order_id: "123",
  orderNumber: "MAGNOLIAPRODUCT20240328143022",
  user_email: "user@example.com",
  product_id: "456",
  product_name: "Memorial Wreath",
  cartId: "789" // if from cart checkout
}
```

### Service Bookings
```typescript
{
  service_id: "MAGNOLIASERVICE20240328143022", // legacy field
  booking_id: "123",
  booking_ids: "MAGNOLIASERVICE20240328143022",
  order_id: "MAGNOLIASERVICE20240328143022",
  description: "Payment for Memorial Cleaning Service",
  user_email: "user@example.com"
}
```

## Webhook Processing Flow

### Payment Success (`payment_intent.succeeded`)
1. Extract metadata from PaymentIntent
2. If `order_id` exists:
   - Update order status to "processing"
   - Clear shopping cart if applicable
3. If `booking_id`/`service_id` exists:
   - Update booking status to "confirmed"
   - Set `is_bought` to true
4. Log success and return confirmation

### Payment Failure (`payment_intent.payment_failed`)
1. Extract failure reason and metadata
2. Update order/booking status to "cancelled"
3. Add failure notes with error details
4. Log failure for investigation

## Monitoring and Logging

### Log Levels
- **INFO**: Successful webhook processing
- **WARN**: Unhandled event types, missing bookings
- **ERROR**: Processing failures, signature verification failures

### Critical Failure Alerts
The system identifies critical events that require immediate attention:
- Payment success/failure events
- Invoice payment events
- Subscription-related failures

### Audit Trail
All webhook events are logged with:
- Event ID and type
- Processing result
- Execution time
- Error details (if applicable)

## Testing

### Stripe CLI Testing
Use Stripe CLI to test webhooks locally:

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

### Manual Testing
1. Create a test payment intent through your application
2. Monitor logs for webhook processing
3. Verify database updates (order/booking status)
4. Check Stripe dashboard for delivery status

## Security Considerations

1. **Signature Verification**: All webhook requests are verified using Stripe's signature
2. **Environment Variables**: Webhook secrets are stored securely in environment variables
3. **Data Sanitization**: Sensitive data is masked in logs
4. **Rate Limiting**: Consider implementing rate limiting for webhook endpoints
5. **HTTPS Only**: Webhook endpoints should only accept HTTPS requests in production

## Troubleshooting

### Common Issues

1. **Signature Verification Failures**
   - Check `STRIPE_WEBHOOK_SECRET` is correct
   - Ensure raw body parsing is configured
   - Verify endpoint URL in Stripe dashboard

2. **Database Update Failures**
   - Check database connectivity
   - Verify order/booking IDs in metadata
   - Review database schema changes

3. **Missing Webhook Events**
   - Check Stripe dashboard event delivery status
   - Review webhook endpoint configuration
   - Verify event types are enabled

### Debug Mode
Enable detailed logging by setting log level to debug in your NestJS configuration:

```typescript
// main.ts
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn', 'log', 'debug'],
});
```
