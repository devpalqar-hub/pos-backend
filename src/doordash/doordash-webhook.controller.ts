import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { DoorDashService } from './doordash.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Public webhook receiver for DoorDash Merchant API orders.
 *
 * This controller lives outside the authenticated route tree.
 * HMAC-SHA256 signature verification is performed inside the service
 * using the per-restaurant webhookSecret.
 *
 * Register the URL below in the DoorDash Developer Portal:
 *   POST  /api/v1/doordash/webhook/:restaurantId
 */
@ApiTags('DoorDash — Webhook (Public)')
@Controller('doordash/webhook')
export class DoorDashWebhookController {
  constructor(private readonly doorDashService: DoorDashService) {}

  /**
   * POST /api/v1/doordash/webhook/:restaurantId
   *
   * DoorDash sends all order lifecycle events here.
   * The endpoint always returns 200 to prevent DoorDash retry floods;
   * actual processing status is stored in the DoorDashWebhookLog table.
   */
  @Post(':restaurantId')
  @Public()            // Bypasses JWT guard — security is handled by HMAC signature check
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'restaurantId',
    description:
      'The UUID of the restaurant this webhook is registered for. ' +
      'Retrieve it from GET /restaurants/:id/doordash/settings → webhookUrl.',
  })
  @ApiOperation({
    summary: 'DoorDash webhook receiver (public)',
    description: `
**This endpoint is called by DoorDash — not by your front-end.**

Register it in the [DoorDash Developer Portal](https://developer.doordash.com) as your webhook URL:
\`\`\`
POST https://your-domain.com/api/v1/doordash/webhook/<restaurantId>
\`\`\`

### Security
- The endpoint is public (no Bearer token required).
- Incoming payloads are verified using **HMAC-SHA256** with the \`webhookSecret\` stored in the restaurant's DoorDash settings.
- Invalid signatures are logged and ignored; a \`200 OK\` is still returned to prevent retry floods.

### Supported events
| event_type | Action |
|---|---|
| \`ORDER_CREATED\` | Creates an OrderSession + OrderBatch in the POS (when \`autoCreateOrders=true\`) |
| \`ORDER_CANCELLED\` | Logged only (manual session cancellation required) |
| \`ORDER_UPDATED\` | Logged only |
| \`ORDER_PICKED_UP\` | Logged only |
| \`ORDER_DELIVERED\` | Logged only |

### Payload example
\`\`\`json
{
  "id": "event-uuid",
  "event_type": "ORDER_CREATED",
  "created_at": "2026-03-05T10:00:00Z",
  "order": {
    "id": "dd-order-uuid",
    "customer": { "first_name": "Jane", "last_name": "Doe", "phone_number": "+15551234567" },
    "delivery_address": { "formatted_address": "123 Main St, City, ST 12345" },
    "items": [
      { "id": "dd-item-uuid", "name": "Classic Burger", "quantity": 2, "unit_price": 1500 }
    ],
    "subtotal": 3000,
    "tax_amount": 250,
    "total": 3250,
    "special_instructions": "Extra sauce"
  }
}
\`\`\`

### Signature header
\`\`\`
X-DoorDash-Signature: t=<unix_timestamp>,v1=<hmac_sha256_hex>
\`\`\`
    `,
  })
  @ApiResponse({ status: 200, description: 'Webhook received.' })
  async receiveWebhook(
    @Param('restaurantId') restaurantId: string,
    @Headers('x-doordash-signature') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean; event: string; sessionId: string | null }> {
    // Use raw body buffer for HMAC verification (populated because rawBody:true in main.ts)
    const rawBody: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

    return this.doorDashService.handleWebhook(restaurantId, rawBody, signature);
  }
}
