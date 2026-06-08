import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
    ApiExtraModels,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateSessionDto, OrderChannel } from './dto/create-session.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';
import { UpdateBatchStatusDto } from './dto/update-batch-status.dto';
import { UpdateSessionStatusDto, SessionStatus } from './dto/update-session-status.dto';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillStatus, User, UserRole } from '@prisma/client';

// ─── All roles that interact with orders ──────────────────────────────────────
const ALL_ORDER_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.WAITER,
    UserRole.CHEF,
    UserRole.BILLER,
];

const MANAGE_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.BILLER
];

const WAITER_AND_ABOVE = [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.BILLER,
    UserRole.WAITER,
];

const BILLER_AND_ABOVE = [
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.BILLER,
];

@ApiTags('Orders')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    // =========================================================================
    // SESSIONS
    // =========================================================================

    /**
     * POST /restaurants/:restaurantId/sessions
     * Open a new order session (WAITER / RESTAURANT_ADMIN / OWNER / SUPER_ADMIN)
     */
    @Post('restaurants/:restaurantId/sessions')
    @Roles(...WAITER_AND_ABOVE)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Open a new order session',
        description:
            'Creates a new session on a table (or ungrouped for online/delivery). ' +
            'A 6-char alphanumeric session number is auto-generated. ' +
            'Multiple OPEN sessions on the same table are allowed (split-bill scenario).',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiResponse({ status: 201, description: 'Session opened' })
    createSession(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateSessionDto,
    ) {
        return this.ordersService.createSession(actor, restaurantId, dto);
    }

    /**
     * GET /restaurants/:restaurantId/sessions
     */
    @Get('restaurants/:restaurantId/sessions')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'List all sessions for a restaurant' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'status', enum: SessionStatus, required: false })
    @ApiQuery({ name: 'tableId', required: false, description: 'Filter by table UUID' })
    @ApiQuery({ name: 'channel', required: false, description: 'Filter by channel (DINE_IN, WALK_IN, ONLINE_OWN, UBER_EATS)' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    findAllSessions(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('status') status?: SessionStatus,
        @Query('tableId') tableId?: string,
        @Query('channel') channel?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = parseInt(page ?? '1');
        const limitNum = parseInt(limit ?? '10');
        return this.ordersService.findAllSessions(actor, restaurantId, { status, tableId, channel }, pageNum, limitNum);
    }

    /**
     * GET /restaurants/:restaurantId/sessions/:sessionId
     */
    @Get('restaurants/:restaurantId/sessions/:sessionId')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'Get full session detail (with batches, items, bill)' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    findOneSession(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
    ) {
        return this.ordersService.findOneSession(actor, restaurantId, sessionId);
    }

    /**
     * PATCH /restaurants/:restaurantId/sessions/:sessionId/status
     * 
     * State Machine Validation:
     * Valid transitions:
     * - OPEN → BILLED (generate bill)
     * - OPEN → CANCELLED (cancel before billing)
     * - BILLED → PAID (payment received)
     * - BILLED → VOID (admin override)
     * 
     * Terminal states (no further transitions): PAID, CANCELLED, VOID
     * No reverse or cross-flow transitions allowed.
     */
    @Patch('restaurants/:restaurantId/sessions/:sessionId/status')
    @Roles(...MANAGE_ROLES)
    @ApiOperation({
        summary: 'Update session status with state machine validation',
        description:
            'Updates order session status with strict state machine rules. ' +
            'Valid flows: (1) OPEN → BILLED → PAID, (2) OPEN → CANCELLED, (3) BILLED → VOID. ' +
            'Reverse and cross-flow transitions are blocked.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    @ApiResponse({
        status: 200,
        description: 'Session status updated successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid status transition (state machine violation)',
    })
    updateSessionStatus(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Body() dto: UpdateSessionStatusDto,
    ) {
        return this.ordersService.updateSessionStatus(actor, restaurantId, sessionId, dto);
    }

    // =========================================================================
    // BATCHES
    // =========================================================================

    /**
     * POST /restaurants/:restaurantId/sessions/:sessionId/batches
     * Waiter sends a new round of items to the kitchen.
     */
    @Post('restaurants/:restaurantId/sessions/:sessionId/batches')
    @Roles(...WAITER_AND_ABOVE)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Add a new batch of items to a session (waiter → kitchen)',
        description:
            'Each call creates a new batch with an auto-generated 6-char batch number. ' +
            'Item prices are snapshotted at the time of the call (active price rules applied). ' +
            'A WebSocket event `batch:created` is emitted to kitchen and restaurant rooms.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    @ApiResponse({ status: 201, description: 'Batch created and sent to kitchen' })
    @ApiResponse({ status: 400, description: 'Session not OPEN, or item out-of-stock / inactive' })
    addBatch(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Body() dto: CreateBatchDto,
    ) {
        return this.ordersService.addBatch(actor, restaurantId, sessionId, dto);
    }

    /**
     * GET /restaurants/:restaurantId/sessions/:sessionId/batches
     */
    @Get('restaurants/:restaurantId/sessions/:sessionId/batches')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'List all batches of a session' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    findAllBatches(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        const pageNum = parseInt(page ?? '1');
        const limitNum = parseInt(limit ?? '10');
        return this.ordersService.findAllBatches(actor, restaurantId, sessionId, pageNum, limitNum);
    }

    @Get('restaurants/:restaurantId/orders/list/')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'List restaurant orders with analytics' })
    @ApiParam({ name: 'restaurantId' })
    @ApiQuery({ name: 'channel', enum: OrderChannel, required: false })
    @ApiQuery({ name: 'status', enum: SessionStatus, required: false })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiQuery({ name: 'search', required: false, description: 'Search by customer name' })
    getOrders(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('channel') channel?: OrderChannel,
        @Query('status') status?: SessionStatus,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
    ) {
        return this.ordersService.getOrdersWithAnalytics(
            actor,
            restaurantId,
            {
                channel,
                status,
                startDate,
                endDate,
                search,   // 👈 pass down
            },
            parseInt(page ?? '1'),
            parseInt(limit ?? '20'),
        );
    }

    @Get('restaurants/:restaurantId/orders/get/:sessionId')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'Get single order details' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Order session UUID' })
    getOrderDetails(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
    ) {
        return this.ordersService.getOrderDetails(actor, restaurantId, sessionId);
    }

    @Get('restaurants/:restaurantId/analytics/orders')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'Restaurant order analytics' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'sessionStatus', enum: SessionStatus, required: false })
    @ApiQuery({ name: 'billStatus', enum: BillStatus, required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    getOrderAnalytics(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('sessionStatus') sessionStatus?: SessionStatus,
        @Query('billStatus') billStatus?: BillStatus,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.ordersService.getOrderAnalytics(actor, restaurantId, {
            sessionStatus,
            billStatus,
            startDate,
            endDate,
        });
    }

    @Get('restaurants/:restaurantId/analytics/orders/timeline')
    @Roles(...ALL_ORDER_ROLES)

    @ApiOperation({
        summary: 'Orders timeline analytics',
        description: 'Returns order counts grouped by period and channel',
    })

    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })

    @ApiQuery({
        name: 'period',
        required: true,
        enum: ['day', 'week', 'month', 'year'],
    })

    @ApiQuery({
        name: 'value',
        required: false,
        description: `
    day   → YYYY-MM-DD
    month → 1-12
    year  → YYYY
    week  → ignored
    `,
    })
    getOrderTimeline(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('period') period: 'day' | 'week' | 'month' | 'year',
        @Query('value') value?: string,
    ) {
        return this.ordersService.getOrderTimeline(actor, restaurantId, period, value);
    }



    @Get('restaurants/:restaurantId/analytics/revenue/timeline')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({
        summary: 'Revenue timeline analytics',
        description: 'Returns revenue grouped by period and channel',
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiQuery({
        name: 'period',
        required: true,
        enum: ['day', 'week', 'month', 'year'],
    })
    @ApiQuery({
        name: 'value',
        required: false,
        description: `
day   → YYYY-MM-DD
month → 1-12
year  → YYYY
week  → ignored
`,
    })
    getRevenueTimeline(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('period') period: 'day' | 'week' | 'month' | 'year',
        @Query('value') value?: string,
    ) {
        return this.ordersService.getRevenueTimeline(actor, restaurantId, period, value);
    }


    /**
     * PATCH /orders/batches/:batchId/status
     * Manual batch status override (chef / waiter / admin).
     */
    @Patch('restaurants/:restaurantId/sessions/:sessionId/batches/:batchId/status')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({
        summary: 'Update batch status (manual override)',
        description:
            'Batch status is also auto-synced when individual item statuses change. ' +
            'Use this for manual corrections or bulk "mark all served" scenarios.',
    })
    @ApiParam({ name: 'batchId', description: 'Batch UUID' })
    updateBatchStatus(

        @CurrentUser() actor: User,
        @Param('batchId', ParseUUIDPipe) batchId: string,
        @Body() dto: UpdateBatchStatusDto,
    ) {
        return this.ordersService.updateBatchStatus(actor, batchId, dto);
    }

    // =========================================================================
    // ITEM STATUS
    // =========================================================================

    /**
     * PATCH /orders/items/:itemId/status
     * Chef marks PREPARING/PREPARED; Waiter marks SERVED; either may CANCEL.
     */
    @Patch('restaurants/:restaurantId/sessions/:sessionId/batches/:batchId/items/:itemId/status')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({
        summary: 'Update order item status',
        description:
            '**Chef**: PENDING → PREPARING → PREPARED (intermediate steps optional)\n\n' +
            '**Waiter**: PREPARED → SERVED (or PENDING → SERVED directly)\n\n' +
            '**Either**: any → CANCELLED (cancelReason required)\n\n' +
            'Batch status auto-syncs after each item change (WebSocket: `batch:status:changed`).',
    })
    @ApiParam({ name: 'itemId', description: 'Order item UUID' })
    updateItemStatus(
        @CurrentUser() actor: User,
        @Param('itemId', ParseUUIDPipe) itemId: string,
        @Body() dto: UpdateItemStatusDto,
    ) {
        console.log(`Received request to update item ${itemId} status to ${dto.status} by user ${actor.id}`);
        return this.ordersService.updateItemStatus(actor, itemId, dto);
    }

    // =========================================================================
    // KITCHEN & BILLING VIEWS
    // =========================================================================

    /**
     * GET /restaurants/:restaurantId/kitchen
     * Chef / admin view: all active (non-served, non-cancelled) batches.
     */
    @Get('restaurants/:restaurantId/kitchen')
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
        UserRole.CHEF,
    )
    @ApiOperation({
        summary: 'Kitchen view — active batches for all open sessions',
        description:
            'Returns all PENDING / IN_PROGRESS / READY batches in chronological order. ' +
            'Items already SERVED or CANCELLED are excluded from the item list.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    getKitchenView(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return this.ordersService.getKitchenView(actor, restaurantId);
    }

    /**
     * GET /restaurants/:restaurantId/billing
     * Biller / admin view: all sessions pending billing or payment.
     */
    @Get('restaurants/:restaurantId/billing')
    @Roles(...BILLER_AND_ABOVE)
    @ApiOperation({
        summary: 'Billing view — sessions awaiting billing or payment',
        description: 'Returns all OPEN and BILLED sessions with bill summary and payment progress.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    getBillingView(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return this.ordersService.getBillingView(actor, restaurantId);
    }

    // =========================================================================
    // BILL
    // =========================================================================

    /**
     * POST /restaurants/:restaurantId/sessions/:sessionId/bill
     * Biller generates the bill for a session.
     */
    @Post('restaurants/:restaurantId/sessions/:sessionId/bill')
    @Roles(...BILLER_AND_ABOVE)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Generate bill for a session',
        description:
            'Aggregates all non-cancelled items across all batches, applies restaurant tax rate, ' +
            'and creates a Bill snapshot. Session status moves to BILLED. ' +
            'WebSocket: `bill:generated` emitted to billing room.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    @ApiResponse({ status: 201, description: 'Bill generated' })
    @ApiResponse({ status: 400, description: 'No items or session not OPEN' })
    @ApiResponse({ status: 409, description: 'Bill already exists for this session' })
    generateBill(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
        @Body() dto: GenerateBillDto,
    ) {
        return this.ordersService.generateBill(actor, restaurantId, sessionId, dto);
    }


    /**
     * GET /restaurants/:restaurantId/sessions/:sessionId/bill
     */
    @Get('restaurants/:restaurantId/sessions/:sessionId/bill')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({ summary: 'Get the bill for a session' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'sessionId', description: 'Session UUID' })
    getBillForSession(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('sessionId', ParseUUIDPipe) sessionId: string,
    ) {
        return this.ordersService.getBillForSession(actor, restaurantId, sessionId);
    }

    @Get('restaurants/:restaurantId/sessions/:sessionId/bill/preview')
    @Roles(...ALL_ORDER_ROLES)
    @ApiOperation({
        summary: 'Preview bill before generating',
        description: `
Computes a full bill preview without persisting anything.

### Key response fields
| Field | Description |
|---|---|
| \`subtotal\` / \`totalAmount\` | Computed totals including tax and discounts |
| \`coupon\` | Applied coupon details (if \`couponCode\` passed) |
| \`loyalty\` | Loyalty points consumed + selected offer details (if \`claimedLoyalityPoints=true\`) |
| \`loyalty.willEarn\` | Points the customer will earn from **this** bill after payment |
| **\`applicableLoyaltyOffers\`** | **List of active loyalty offers the customer can afford right now**, ordered by \`pointsRequired\` ASC |

### \`applicableLoyaltyOffers\` item shape
\`\`\`json
{
  "id": "<offerId>",
  "name": "Free Dessert",
  "type": "FOOD",
  "pointsRequired": 100,
  "redeemAmount": null,
  "validFrom": null,
  "validTo": null,
  "menuItems": [{ "id": "...", "name": "Chocolate Cake", "price": "6.50" }],
  "customerCanRedeem": true,
  "customerWallet": 150,
  "pointsShortfall": 0
}
\`\`\`

> **Only offers the customer can currently afford are returned** (\`customerWallet >= pointsRequired\`).
> Pass the \`id\` as \`loyalityOfferId\` in the generate-bill body to redeem an offer.
> Requires customer data (\`customerEmail\` / \`customerPhone\`) to be present in the request.
        `,
    })
    @ApiParam({ name: 'restaurantId' })
    @ApiParam({ name: 'sessionId' })
    async previewBill(
        @CurrentUser() actor: User,
        @Param('restaurantId') restaurantId: string,
        @Param('sessionId') sessionId: string,
        @Query() dto: GenerateBillDto,
    ) {
        const data = await this.ordersService.previewBill(actor, restaurantId, sessionId, dto);

        return {
            success: true,
            statusCode: 200,
            message: 'Request successful',
            data,
            timestamp: new Date().toISOString(),
        };
    }


    // =========================================================================
    // PAYMENTS
    // =========================================================================

    /**
     * POST /orders/bills/:billId/payments
     * Biller records a payment (supports partial / split payments).
     */
    @Post('orders/bills/:billId/payments')
    @Roles(...BILLER_AND_ABOVE)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Record a payment against a bill',
        description:
            'Supports partial payments. When the total collected equals bill.totalAmount, ' +
            'the bill and session are automatically marked PAID and the table is released. ' +
            'WebSocket: `payment:recorded` and (if fully paid) `bill:paid` emitted.',
    })
    @ApiParam({ name: 'billId', description: 'Bill UUID' })
    @ApiResponse({ status: 201, description: 'Payment recorded' })
    @ApiResponse({ status: 400, description: 'Amount exceeds balance, or bill already paid/voided' })
    addPayment(
        @CurrentUser() actor: User,
        @Param('billId', ParseUUIDPipe) billId: string,
        @Body() dto: AddPaymentDto,
    ) {
        return this.ordersService.addPayment(actor, billId, dto);
    }

    /**
     * GET /orders/bills/:billId/payments
     */
    @Get('orders/bills/:billId/payments')
    @Roles(...BILLER_AND_ABOVE)
    @ApiOperation({ summary: 'List all payments for a bill' })
    @ApiParam({ name: 'billId', description: 'Bill UUID' })
    getPaymentsForBill(
        @CurrentUser() actor: User,
        @Param('billId', ParseUUIDPipe) billId: string,
    ) {
        return this.ordersService.getPaymentsForBill(actor, billId);
    }
}
