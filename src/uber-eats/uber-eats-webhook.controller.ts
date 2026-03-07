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
import { UberEatsService } from './uber-eats.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Public webhook receiver for Uber Eats orders.
 *
 * This controller lives outside the authenticated route tree.
 * HMAC-SHA256 signature verification is performed inside the service
 * using the per-restaurant webhookSecret.
 *
 * Register the URL below in the Uber Developer Dashboard:
 *   POST  /api/v1/uber-eats/webhook/:restaurantId
 */
@ApiTags('Uber Eats — Webhook (Public)')
@Controller('uber-eats/webhook')
export class UberEatsWebhookController {
    constructor(private readonly uberEatsService: UberEatsService) { }

    /**
     * POST /api/v1/uber-eats/webhook/:restaurantId
     *
     * Uber Eats sends all order lifecycle events here.
     * The endpoint always returns 200 to prevent retry floods;
     * actual processing status is stored in the UberEatsWebhookLog table.
     */
    @Post(':restaurantId')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiParam({
        name: 'restaurantId',
        description:
            'The UUID of the restaurant this webhook is registered for. ' +
            'Retrieve it from GET /restaurants/:id/uber-eats/settings → webhookUrl.',
    })
    @ApiOperation({
        summary: 'Uber Eats webhook receiver (public)',
        description: `
**This endpoint is called by Uber Eats — not by your front-end.**

Register it in the [Uber Developer Dashboard](https://developer.uber.com) as your webhook URL:
\`\`\`
POST https://your-domain.com/api/v1/uber-eats/webhook/<restaurantId>
\`\`\`

### Security
- The endpoint is public (no Bearer token required).
- Incoming payloads are verified using **HMAC-SHA256** with the \`webhookSecret\` stored in the restaurant's Uber Eats settings.
- Invalid signatures are logged and ignored; a \`200 OK\` is still returned to prevent retry floods.

### Supported events
| event_type / status | Action |
|---|---|
| \`ORDER_CREATED\` | Creates an OrderSession + OrderBatch in the POS (when \`autoCreateOrders=true\`) |
| \`ORDER_ACCEPTED\` | Logged only |
| \`ORDER_DENIED\` | Logged only |
| \`ORDER_CANCELLED\` | Logged only (manual session cancellation required) |
| \`ORDER_READY_FOR_PICKUP\` | Logged only |
| \`ORDER_PICKED_UP\` | Logged only |
| \`ORDER_DELIVERED\` | Logged only |
    `,
    })
    @ApiResponse({ status: 200, description: 'Event acknowledged.' })
    async receiveWebhook(
        @Param('restaurantId') restaurantId: string,
        @Req() req: Request,
        @Headers('x-uber-signature') signature?: string,
    ) {
        const rawBody = (req as any).rawBody as Buffer | undefined;
        const body = rawBody ?? Buffer.from(JSON.stringify(req.body));

        return this.uberEatsService.handleWebhook(restaurantId, body, signature);
    }
}
