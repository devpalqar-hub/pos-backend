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
} from '@nestjs/swagger';
import { Request } from 'express';
import { ToastService } from './toast.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Public webhook receiver for Toast POS real-time events.
 *
 * This controller lives outside the authenticated route tree.
 * HMAC-SHA256 signature verification is performed inside the service
 * using the per-restaurant webhookSecret (stored in ToastSettings).
 *
 * Register the URL below in the Toast Developer Portal → Webhooks:
 *   POST  /api/v1/toast/webhook/:restaurantId
 *
 * Toast will send events with the header:
 *   Toast-Notification-Signature: <hmac_sha256_hex>
 */
@ApiTags('Toast Integration — Webhook (Public)')
@Controller('toast/webhook')
export class ToastWebhookController {
  constructor(private readonly toastService: ToastService) {}

  /**
   * POST /api/v1/toast/webhook/:restaurantId
   *
   * Toast sends all order and menu lifecycle events here.
   * The endpoint ALWAYS returns 200 to prevent Toast retry floods;
   * actual processing status is stored in the ToastWebhookLog table.
   */
  @Post(':restaurantId')
  @Public()            // Bypasses JWT guard — security is handled by HMAC signature check
  @HttpCode(HttpStatus.OK)
  @ApiParam({
    name: 'restaurantId',
    description:
      'The UUID of the restaurant this webhook is registered for. ' +
      'Retrieve it from GET /restaurants/:id/toast/settings.',
  })
  @ApiOperation({
    summary: 'Toast webhook receiver (public)',
    description: `
**This endpoint is called by Toast — not by your front-end.**

Register it in the [Toast Developer Portal](https://dev.toasttab.com) as your webhook URL:
\`\`\`
POST https://your-domain.com/api/v1/toast/webhook/<restaurantId>
\`\`\`

### Security
- The endpoint is public (no Bearer token required).
- Incoming payloads are verified using **HMAC-SHA256** with the \`webhookSecret\` stored in
  the restaurant's Toast settings (configure it via \`PUT /restaurants/:id/toast/settings\`).
- If no \`webhookSecret\` is configured, the signature check is skipped (not recommended for production).
- Invalid signatures are logged and ignored; a \`200 OK\` is still returned to prevent retry floods.

### Supported events
| eventType | Action |
|---|---|
| \`ORDER_CREATED\` | Creates an OrderSession + OrderBatch in the POS (when \`autoCreateOrders=true\`) |
| \`ORDER_UPDATED\` | Logged only |
| \`ORDER_DELETED\` | Logged only |
| \`ORDER_VOIDED\`  | Logged only |
| \`MENU_PUBLISHED\` | Logged (manual menu sync recommended) |
| Unknown | Logged only |

### Payload example (ORDER_CREATED)
\`\`\`json
{
  "eventType": "ORDER_CREATED",
  "eventId": "evt-uuid",
  "restaurantGuid": "<toastRestaurantExternalId>",
  "order": {
    "guid": "order-uuid",
    "numberOfGuests": 2,
    "customer": { "name": "Jane Doe", "phone": "+15551234567", "email": "jane@example.com" },
    "checks": [
      {
        "selections": [
          {
            "item": { "guid": "menu-item-toast-guid" },
            "displayName": "Classic Burger",
            "quantity": 2,
            "price": 1200
          }
        ]
      }
    ],
    "deliveryInfo": {
      "address1": "123 Main St, Boston, MA 02101",
      "notes": "Ring doorbell twice"
    }
  }
}
\`\`\`

### Signature header
\`\`\`
Toast-Notification-Signature: <hmac_sha256_hex_of_raw_body>
\`\`\`
    `,
  })
  @ApiResponse({ status: 200, description: 'Webhook received.' })
  async receiveWebhook(
    @Param('restaurantId') restaurantId: string,
    @Headers('toast-notification-signature') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ): Promise<{ received: boolean; event: string; sessionId: string | null }> {
    // Use raw body buffer for accurate HMAC verification
    // (rawBody is populated because bodyParser rawBody:true is set in main.ts)
    const rawBody: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

    return this.toastService.handleWebhook(restaurantId, rawBody, signature);
  }
}
