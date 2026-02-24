"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const create_batch_dto_1 = require("./dto/create-batch.dto");
const update_item_status_dto_1 = require("./dto/update-item-status.dto");
const update_batch_status_dto_1 = require("./dto/update-batch-status.dto");
const update_session_status_dto_1 = require("./dto/update-session-status.dto");
const generate_bill_dto_1 = require("./dto/generate-bill.dto");
const add_payment_dto_1 = require("./dto/add-payment.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
const ALL_ORDER_ROLES = [
    client_1.UserRole.SUPER_ADMIN,
    client_1.UserRole.OWNER,
    client_1.UserRole.RESTAURANT_ADMIN,
    client_1.UserRole.WAITER,
    client_1.UserRole.CHEF,
    client_1.UserRole.BILLER,
];
const MANAGE_ROLES = [
    client_1.UserRole.SUPER_ADMIN,
    client_1.UserRole.OWNER,
    client_1.UserRole.RESTAURANT_ADMIN,
];
const WAITER_AND_ABOVE = [
    client_1.UserRole.SUPER_ADMIN,
    client_1.UserRole.OWNER,
    client_1.UserRole.RESTAURANT_ADMIN,
    client_1.UserRole.WAITER,
];
const BILLER_AND_ABOVE = [
    client_1.UserRole.SUPER_ADMIN,
    client_1.UserRole.OWNER,
    client_1.UserRole.RESTAURANT_ADMIN,
    client_1.UserRole.BILLER,
];
let OrdersController = class OrdersController {
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    createSession(actor, restaurantId, dto) {
        return this.ordersService.createSession(actor, restaurantId, dto);
    }
    findAllSessions(actor, restaurantId, status, tableId, channel) {
        return this.ordersService.findAllSessions(actor, restaurantId, { status, tableId, channel });
    }
    findOneSession(actor, restaurantId, sessionId) {
        return this.ordersService.findOneSession(actor, restaurantId, sessionId);
    }
    updateSessionStatus(actor, restaurantId, sessionId, dto) {
        return this.ordersService.updateSessionStatus(actor, restaurantId, sessionId, dto);
    }
    addBatch(actor, restaurantId, sessionId, dto) {
        return this.ordersService.addBatch(actor, restaurantId, sessionId, dto);
    }
    findAllBatches(actor, restaurantId, sessionId) {
        return this.ordersService.findAllBatches(actor, restaurantId, sessionId);
    }
    updateBatchStatus(actor, batchId, dto) {
        return this.ordersService.updateBatchStatus(actor, batchId, dto);
    }
    updateItemStatus(actor, itemId, dto) {
        return this.ordersService.updateItemStatus(actor, itemId, dto);
    }
    getKitchenView(actor, restaurantId) {
        return this.ordersService.getKitchenView(actor, restaurantId);
    }
    getBillingView(actor, restaurantId) {
        return this.ordersService.getBillingView(actor, restaurantId);
    }
    generateBill(actor, restaurantId, sessionId, dto) {
        return this.ordersService.generateBill(actor, restaurantId, sessionId, dto);
    }
    getBillForSession(actor, restaurantId, sessionId) {
        return this.ordersService.getBillForSession(actor, restaurantId, sessionId);
    }
    addPayment(actor, billId, dto) {
        return this.ordersService.addPayment(actor, billId, dto);
    }
    getPaymentsForBill(actor, billId) {
        return this.ordersService.getPaymentsForBill(actor, billId);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('restaurants/:restaurantId/sessions'),
    (0, roles_decorator_1.Roles)(...WAITER_AND_ABOVE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Open a new order session',
        description: 'Creates a new session on a table (or ungrouped for online/delivery). ' +
            'A 6-char alphanumeric session number is auto-generated. ' +
            'Multiple OPEN sessions on the same table are allowed (split-bill scenario).',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Session opened' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "createSession", null);
__decorate([
    (0, common_1.Get)('restaurants/:restaurantId/sessions'),
    (0, roles_decorator_1.Roles)(...ALL_ORDER_ROLES),
    (0, swagger_1.ApiOperation)({ summary: 'List all sessions for a restaurant' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: update_session_status_dto_1.SessionStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'tableId', required: false, description: 'Filter by table UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'channel', required: false, description: 'Filter by channel (DINE_IN, ONLINE_OWN, UBER_EATS)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('tableId')),
    __param(4, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findAllSessions", null);
__decorate([
    (0, common_1.Get)('restaurants/:restaurantId/sessions/:sessionId'),
    (0, roles_decorator_1.Roles)(...ALL_ORDER_ROLES),
    (0, swagger_1.ApiOperation)({ summary: 'Get full session detail (with batches, items, bill)' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Session UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findOneSession", null);
__decorate([
    (0, common_1.Patch)('restaurants/:restaurantId/sessions/:sessionId/status'),
    (0, roles_decorator_1.Roles)(...MANAGE_ROLES),
    (0, swagger_1.ApiOperation)({
        summary: 'Manually update session status',
        description: 'Admin override. Normal flow: OPEN → BILLED (via generate-bill) → PAID (via payment).',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Session UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_session_status_dto_1.UpdateSessionStatusDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateSessionStatus", null);
__decorate([
    (0, common_1.Post)('restaurants/:restaurantId/sessions/:sessionId/batches'),
    (0, roles_decorator_1.Roles)(...WAITER_AND_ABOVE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Add a new batch of items to a session (waiter → kitchen)',
        description: 'Each call creates a new batch with an auto-generated 6-char batch number. ' +
            'Item prices are snapshotted at the time of the call (active price rules applied). ' +
            'A WebSocket event `batch:created` is emitted to kitchen and restaurant rooms.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Session UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Batch created and sent to kitchen' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Session not OPEN, or item out-of-stock / inactive' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, create_batch_dto_1.CreateBatchDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "addBatch", null);
__decorate([
    (0, common_1.Get)('restaurants/:restaurantId/sessions/:sessionId/batches'),
    (0, roles_decorator_1.Roles)(...ALL_ORDER_ROLES),
    (0, swagger_1.ApiOperation)({ summary: 'List all batches of a session' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Session UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findAllBatches", null);
__decorate([
    (0, common_1.Patch)('orders/batches/:batchId/status'),
    (0, roles_decorator_1.Roles)(...ALL_ORDER_ROLES),
    (0, swagger_1.ApiOperation)({
        summary: 'Update batch status (manual override)',
        description: 'Batch status is also auto-synced when individual item statuses change. ' +
            'Use this for manual corrections or bulk "mark all served" scenarios.',
    }),
    (0, swagger_1.ApiParam)({ name: 'batchId', description: 'Batch UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('batchId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_batch_status_dto_1.UpdateBatchStatusDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateBatchStatus", null);
__decorate([
    (0, common_1.Patch)('orders/items/:itemId/status'),
    (0, roles_decorator_1.Roles)(...ALL_ORDER_ROLES),
    (0, swagger_1.ApiOperation)({
        summary: 'Update order item status',
        description: '**Chef**: PENDING → PREPARING → PREPARED (intermediate steps optional)\n\n' +
            '**Waiter**: PREPARED → SERVED (or PENDING → SERVED directly)\n\n' +
            '**Either**: any → CANCELLED (cancelReason required)\n\n' +
            'Batch status auto-syncs after each item change (WebSocket: `batch:status:changed`).',
    }),
    (0, swagger_1.ApiParam)({ name: 'itemId', description: 'Order item UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_item_status_dto_1.UpdateItemStatusDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "updateItemStatus", null);
__decorate([
    (0, common_1.Get)('restaurants/:restaurantId/kitchen'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.CHEF),
    (0, swagger_1.ApiOperation)({
        summary: 'Kitchen view — active batches for all open sessions',
        description: 'Returns all PENDING / IN_PROGRESS / READY batches in chronological order. ' +
            'Items already SERVED or CANCELLED are excluded from the item list.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getKitchenView", null);
__decorate([
    (0, common_1.Get)('restaurants/:restaurantId/billing'),
    (0, roles_decorator_1.Roles)(...BILLER_AND_ABOVE),
    (0, swagger_1.ApiOperation)({
        summary: 'Billing view — sessions awaiting billing or payment',
        description: 'Returns all OPEN and BILLED sessions with bill summary and payment progress.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getBillingView", null);
__decorate([
    (0, common_1.Post)('restaurants/:restaurantId/sessions/:sessionId/bill'),
    (0, roles_decorator_1.Roles)(...BILLER_AND_ABOVE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate bill for a session',
        description: 'Aggregates all non-cancelled items across all batches, applies restaurant tax rate, ' +
            'and creates a Bill snapshot. Session status moves to BILLED. ' +
            'WebSocket: `bill:generated` emitted to billing room.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Session UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Bill generated' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'No items or session not OPEN' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Bill already exists for this session' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, generate_bill_dto_1.GenerateBillDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "generateBill", null);
__decorate([
    (0, common_1.Get)('restaurants/:restaurantId/sessions/:sessionId/bill'),
    (0, roles_decorator_1.Roles)(...ALL_ORDER_ROLES),
    (0, swagger_1.ApiOperation)({ summary: 'Get the bill for a session' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'sessionId', description: 'Session UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getBillForSession", null);
__decorate([
    (0, common_1.Post)('orders/bills/:billId/payments'),
    (0, roles_decorator_1.Roles)(...BILLER_AND_ABOVE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Record a payment against a bill',
        description: 'Supports partial payments. When the total collected equals bill.totalAmount, ' +
            'the bill and session are automatically marked PAID and the table is released. ' +
            'WebSocket: `payment:recorded` and (if fully paid) `bill:paid` emitted.',
    }),
    (0, swagger_1.ApiParam)({ name: 'billId', description: 'Bill UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment recorded' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Amount exceeds balance, or bill already paid/voided' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('billId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, add_payment_dto_1.AddPaymentDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "addPayment", null);
__decorate([
    (0, common_1.Get)('orders/bills/:billId/payments'),
    (0, roles_decorator_1.Roles)(...BILLER_AND_ABOVE),
    (0, swagger_1.ApiOperation)({ summary: 'List all payments for a bill' }),
    (0, swagger_1.ApiParam)({ name: 'billId', description: 'Bill UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('billId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "getPaymentsForBill", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('Orders'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)("orders"),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map