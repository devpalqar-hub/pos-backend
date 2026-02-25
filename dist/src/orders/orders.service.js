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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const client_1 = require("@prisma/client");
const create_session_dto_1 = require("./dto/create-session.dto");
const update_item_status_dto_1 = require("./dto/update-item-status.dto");
const update_session_status_dto_1 = require("./dto/update-session-status.dto");
const id_generator_1 = require("./utils/id-generator");
const orders_gateway_1 = require("./orders.gateway");
const SESSION_SUMMARY_INCLUDE = {
    table: { select: { id: true, name: true, seatCount: true, status: true } },
    openedBy: { select: { id: true, name: true, role: true } },
    _count: { select: { batches: true } },
};
const SESSION_DETAIL_INCLUDE = {
    table: { select: { id: true, name: true, seatCount: true, status: true, groupId: true } },
    openedBy: { select: { id: true, name: true, role: true } },
    batches: {
        orderBy: { createdAt: 'asc' },
        include: {
            createdBy: { select: { id: true, name: true, role: true } },
            items: {
                include: {
                    menuItem: { select: { id: true, name: true, imageUrl: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    },
    bill: {
        include: {
            items: true,
            payments: { orderBy: { createdAt: 'asc' } },
            generatedBy: { select: { id: true, name: true } },
        },
    },
};
const BATCH_INCLUDE = {
    items: { include: { menuItem: { select: { id: true, name: true } } } },
    createdBy: { select: { id: true, name: true, role: true } },
};
const ITEM_STATUS_TRANSITIONS = {
    [update_item_status_dto_1.OrderItemStatus.PENDING]: [
        update_item_status_dto_1.OrderItemStatus.PREPARING,
        update_item_status_dto_1.OrderItemStatus.PREPARED,
        update_item_status_dto_1.OrderItemStatus.SERVED,
        update_item_status_dto_1.OrderItemStatus.CANCELLED,
    ],
    [update_item_status_dto_1.OrderItemStatus.PREPARING]: [
        update_item_status_dto_1.OrderItemStatus.PREPARED,
        update_item_status_dto_1.OrderItemStatus.SERVED,
        update_item_status_dto_1.OrderItemStatus.CANCELLED,
    ],
    [update_item_status_dto_1.OrderItemStatus.PREPARED]: [update_item_status_dto_1.OrderItemStatus.SERVED, update_item_status_dto_1.OrderItemStatus.CANCELLED],
    [update_item_status_dto_1.OrderItemStatus.SERVED]: [],
    [update_item_status_dto_1.OrderItemStatus.CANCELLED]: [],
};
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, gateway) {
        this.prisma = prisma;
        this.gateway = gateway;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async assertRestaurantAccess(actor, restaurantId, mode = 'view') {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) {
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        }
        if (actor.role === client_1.UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new common_1.ForbiddenException('You do not own this restaurant');
            }
            return;
        }
        if (actor.restaurantId !== restaurantId) {
            throw new common_1.ForbiddenException('You are not assigned to this restaurant');
        }
    }
    assertManageRole(actor) {
        const manage = [
            client_1.UserRole.SUPER_ADMIN,
            client_1.UserRole.OWNER,
            client_1.UserRole.RESTAURANT_ADMIN,
        ];
        if (!manage.includes(actor.role)) {
            throw new common_1.ForbiddenException('Only RESTAURANT_ADMIN, OWNER, or SUPER_ADMIN can perform this action');
        }
    }
    async generateUniqueSessionNumber(restaurantId) {
        let id;
        let exists;
        do {
            id = (0, id_generator_1.generateShortId)();
            const existing = await this.prisma.orderSession.findUnique({
                where: { restaurantId_sessionNumber: { restaurantId, sessionNumber: id } },
            });
            exists = !!existing;
        } while (exists);
        return id;
    }
    async generateUniqueBatchNumber(sessionId) {
        let id;
        let exists;
        do {
            id = (0, id_generator_1.generateShortId)();
            const existing = await this.prisma.orderBatch.findUnique({
                where: { sessionId_batchNumber: { sessionId, batchNumber: id } },
            });
            exists = !!existing;
        } while (exists);
        return id;
    }
    async generateUniqueBillNumber(restaurantId) {
        let id;
        let exists;
        do {
            id = (0, id_generator_1.generateShortId)();
            const existing = await this.prisma.bill.findUnique({
                where: { restaurantId_billNumber: { restaurantId, billNumber: id } },
            });
            exists = !!existing;
        } while (exists);
        return id;
    }
    async getEffectivePriceForItem(restaurantId, menuItemId) {
        const item = await this.prisma.menuItem.findFirst({
            where: { id: menuItemId, restaurantId },
            select: { price: true },
        });
        if (!item)
            throw new common_1.NotFoundException(`Menu item ${menuItemId} not found`);
        const now = new Date();
        const rules = await this.prisma.priceRule.findMany({
            where: { restaurantId, menuItemId, isActive: true },
            include: { days: true },
            orderBy: [{ priority: 'desc' }],
        });
        const jsDay = now.getDay();
        const dayMap = {
            0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
            4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
        };
        const currentDayName = dayMap[jsDay];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const matchingRules = rules.filter((rule) => {
            if (rule.ruleType === 'LIMITED_TIME') {
                if (!rule.startDate || !rule.endDate)
                    return false;
                if (now < rule.startDate || now > rule.endDate)
                    return false;
            }
            if (rule.ruleType === 'RECURRING_WEEKLY') {
                if (!rule.days.some((d) => d.day === currentDayName))
                    return false;
            }
            if (rule.startTime && rule.endTime) {
                if (currentTime < rule.startTime || currentTime > rule.endTime)
                    return false;
            }
            return true;
        });
        if (!matchingRules.length)
            return Number(item.price);
        matchingRules.sort((a, b) => {
            if (b.priority !== a.priority)
                return b.priority - a.priority;
            if (a.ruleType === 'LIMITED_TIME' && b.ruleType !== 'LIMITED_TIME')
                return -1;
            if (b.ruleType === 'LIMITED_TIME' && a.ruleType !== 'LIMITED_TIME')
                return 1;
            return 0;
        });
        return Number(matchingRules[0].specialPrice);
    }
    async createSession(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const allowedCreators = [
            client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER,
        ];
        if (!allowedCreators.includes(actor.role)) {
            throw new common_1.ForbiddenException('You are not allowed to open order sessions');
        }
        if (dto.tableId) {
            const table = await this.prisma.table.findFirst({
                where: { id: dto.tableId, restaurantId },
            });
            if (!table) {
                throw new common_1.NotFoundException(`Table ${dto.tableId} not found in restaurant ${restaurantId}`);
            }
            if (!table.isActive) {
                throw new common_1.BadRequestException(`Table ${table.name} is inactive`);
            }
        }
        const sessionNumber = await this.generateUniqueSessionNumber(restaurantId);
        const session = await this.prisma.orderSession.create({
            data: {
                restaurantId,
                tableId: dto.tableId ?? null,
                sessionNumber,
                channel: (dto.channel ?? create_session_dto_1.OrderChannel.DINE_IN),
                customerName: dto.customerName ?? null,
                customerPhone: dto.customerPhone ?? null,
                customerEmail: dto.customerEmail ?? null,
                guestCount: dto.guestCount ?? 1,
                externalOrderId: dto.externalOrderId ?? null,
                deliveryAddress: dto.deliveryAddress ?? null,
                specialInstructions: dto.specialInstructions ?? null,
                openedById: actor.id,
            },
            include: SESSION_SUMMARY_INCLUDE,
        });
        if (dto.tableId) {
            await this.prisma.table.update({
                where: { id: dto.tableId },
                data: { status: 'OCCUPIED' },
            });
            this.gateway.emitTableStatus(dto.tableId, restaurantId, 'OCCUPIED');
        }
        this.gateway.emitToRestaurant(restaurantId, 'session:opened', session);
        this.logger.log(`Session ${sessionNumber} opened by ${actor.name} (${actor.role}) in restaurant ${restaurantId}`);
        return session;
    }
    async findAllSessions(actor, restaurantId, filters, page = 1, limit = 10) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const where = { restaurantId };
        if (filters?.status)
            where.status = filters.status;
        if (filters?.tableId)
            where.tableId = filters.tableId;
        if (filters?.channel)
            where.channel = filters.channel;
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.orderSession,
            page,
            limit,
            where,
            orderBy: { createdAt: 'desc' },
            include: SESSION_SUMMARY_INCLUDE,
        });
    }
    async findOneSession(actor, restaurantId, sessionId) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
            include: SESSION_DETAIL_INCLUDE,
        });
        if (!session) {
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        }
        return session;
    }
    async updateSessionStatus(actor, restaurantId, sessionId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId);
        this.assertManageRole(actor);
        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
        });
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        const updated = await this.prisma.orderSession.update({
            where: { id: sessionId },
            data: {
                status: dto.status,
                ...(dto.status === update_session_status_dto_1.SessionStatus.PAID ||
                    dto.status === update_session_status_dto_1.SessionStatus.CANCELLED ||
                    dto.status === update_session_status_dto_1.SessionStatus.VOID
                    ? { closedAt: new Date() }
                    : {}),
            },
            include: SESSION_SUMMARY_INCLUDE,
        });
        if (session.tableId &&
            [update_session_status_dto_1.SessionStatus.PAID, update_session_status_dto_1.SessionStatus.CANCELLED, update_session_status_dto_1.SessionStatus.VOID].includes(dto.status)) {
            await this.releaseTableIfNoOpenSessions(session.tableId, sessionId);
        }
        this.gateway.emitToRestaurant(restaurantId, 'session:status:changed', {
            sessionId,
            status: dto.status,
        });
        return updated;
    }
    async releaseTableIfNoOpenSessions(tableId, closingSessionId) {
        const openCount = await this.prisma.orderSession.count({
            where: {
                tableId,
                status: 'OPEN',
                id: { not: closingSessionId },
            },
        });
        if (openCount === 0) {
            const table = await this.prisma.table.update({
                where: { id: tableId },
                data: { status: 'AVAILABLE' },
                select: { restaurantId: true },
            });
            this.gateway.emitTableStatus(tableId, table.restaurantId, 'AVAILABLE');
        }
    }
    async addBatch(actor, restaurantId, sessionId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const allowedRoles = [
            client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER,
        ];
        if (!allowedRoles.includes(actor.role)) {
            throw new common_1.ForbiddenException('You are not allowed to add batches');
        }
        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
        });
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        if (session.status !== 'OPEN') {
            throw new common_1.BadRequestException(`Cannot add items to a session with status "${session.status}"`);
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('At least one item is required in a batch');
        }
        const resolvedItems = [];
        for (const item of dto.items) {
            const menuItem = await this.prisma.menuItem.findFirst({
                where: { id: item.menuItemId, restaurantId, isActive: true },
            });
            if (!menuItem) {
                throw new common_1.NotFoundException(`Menu item ${item.menuItemId} not found or inactive in this restaurant`);
            }
            if (!menuItem.isAvailable) {
                throw new common_1.BadRequestException(`Menu item "${menuItem.name}" is not available`);
            }
            if (menuItem.isOutOfStock) {
                throw new common_1.BadRequestException(`Menu item "${menuItem.name}" is out of stock`);
            }
            const unitPrice = await this.getEffectivePriceForItem(restaurantId, item.menuItemId);
            resolvedItems.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                notes: item.notes,
                unitPrice,
                totalPrice: unitPrice * item.quantity,
            });
        }
        const batchNumber = await this.generateUniqueBatchNumber(sessionId);
        const batch = await this.prisma.orderBatch.create({
            data: {
                sessionId,
                batchNumber,
                notes: dto.notes ?? null,
                createdById: actor.id,
                items: {
                    create: resolvedItems.map((i) => ({
                        menuItemId: i.menuItemId,
                        quantity: i.quantity,
                        notes: i.notes ?? null,
                        unitPrice: i.unitPrice,
                        totalPrice: i.totalPrice,
                    })),
                },
            },
            include: {
                items: {
                    include: { menuItem: { select: { id: true, name: true } } },
                },
                createdBy: { select: { id: true, name: true, role: true } },
                session: { select: { id: true, sessionNumber: true, tableId: true, restaurantId: true } },
            },
        });
        this.gateway.emitToKitchen(restaurantId, 'batch:created', batch);
        this.gateway.emitToRestaurant(restaurantId, 'batch:created', batch);
        if (session.tableId) {
            this.gateway.emitToTable(session.tableId, 'batch:created', batch);
        }
        this.logger.log(`Batch ${batchNumber} created in session ${session.sessionNumber} by ${actor.name}`);
        return batch;
    }
    async findAllBatches(actor, restaurantId, sessionId, page = 1, limit = 10) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
        });
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.orderBatch,
            page,
            limit,
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            include: BATCH_INCLUDE,
        });
    }
    async updateBatchStatus(actor, batchId, dto) {
        const batch = await this.prisma.orderBatch.findUnique({
            where: { id: batchId },
            include: { session: { select: { restaurantId: true, tableId: true, sessionNumber: true } } },
        });
        if (!batch)
            throw new common_1.NotFoundException(`Batch ${batchId} not found`);
        await this.assertRestaurantAccess(actor, batch.session.restaurantId);
        const updated = await this.prisma.orderBatch.update({
            where: { id: batchId },
            data: { status: dto.status },
            include: {
                items: { select: { id: true, status: true } },
                session: { select: { id: true, sessionNumber: true, restaurantId: true, tableId: true } },
            },
        });
        this.gateway.emitToKitchen(batch.session.restaurantId, 'batch:status:changed', {
            batchId,
            status: dto.status,
            sessionId: batch.sessionId,
        });
        this.gateway.emitToRestaurant(batch.session.restaurantId, 'batch:status:changed', {
            batchId,
            status: dto.status,
            sessionId: batch.sessionId,
        });
        if (batch.session.tableId) {
            this.gateway.emitToTable(batch.session.tableId, 'batch:status:changed', {
                batchId,
                status: dto.status,
                sessionId: batch.sessionId,
            });
        }
        return updated;
    }
    async updateItemStatus(actor, itemId, dto) {
        const item = await this.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: {
                batch: {
                    include: {
                        session: { select: { restaurantId: true, tableId: true, sessionNumber: true, id: true } },
                    },
                },
            },
        });
        if (!item)
            throw new common_1.NotFoundException(`Order item ${itemId} not found`);
        const restaurantId = item.batch.session.restaurantId;
        await this.assertRestaurantAccess(actor, restaurantId);
        const currentStatus = item.status;
        const allowed = ITEM_STATUS_TRANSITIONS[currentStatus];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition item from "${currentStatus}" to "${dto.status}"`);
        }
        if (dto.status === update_item_status_dto_1.OrderItemStatus.PREPARING ||
            dto.status === update_item_status_dto_1.OrderItemStatus.PREPARED) {
            if (actor.role !== client_1.UserRole.CHEF &&
                actor.role !== client_1.UserRole.SUPER_ADMIN &&
                actor.role !== client_1.UserRole.OWNER &&
                actor.role !== client_1.UserRole.RESTAURANT_ADMIN) {
                throw new common_1.ForbiddenException('Only CHEF can mark items as PREPARING or PREPARED');
            }
        }
        if (dto.status === update_item_status_dto_1.OrderItemStatus.SERVED) {
            if (actor.role !== client_1.UserRole.WAITER &&
                actor.role !== client_1.UserRole.SUPER_ADMIN &&
                actor.role !== client_1.UserRole.OWNER &&
                actor.role !== client_1.UserRole.RESTAURANT_ADMIN) {
                throw new common_1.ForbiddenException('Only WAITER can mark items as SERVED');
            }
        }
        if (dto.status === update_item_status_dto_1.OrderItemStatus.CANCELLED && !dto.cancelReason) {
            throw new common_1.BadRequestException('cancelReason is required when cancelling an item');
        }
        const updated = await this.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                status: dto.status,
                ...(dto.status === update_item_status_dto_1.OrderItemStatus.PREPARED && { preparedAt: new Date() }),
                ...(dto.status === update_item_status_dto_1.OrderItemStatus.SERVED && { servedAt: new Date() }),
                ...(dto.status === update_item_status_dto_1.OrderItemStatus.CANCELLED && {
                    cancelledAt: new Date(),
                    cancelReason: dto.cancelReason,
                }),
            },
            include: {
                menuItem: { select: { id: true, name: true } },
                batch: { select: { id: true, batchNumber: true, sessionId: true } },
            },
        });
        await this.syncBatchStatus(item.batchId, restaurantId, item.batch.session.tableId);
        const payload = {
            itemId,
            status: dto.status,
            batchId: item.batchId,
            sessionId: item.batch.session.id,
        };
        this.gateway.emitToKitchen(restaurantId, 'item:status:changed', payload);
        this.gateway.emitToRestaurant(restaurantId, 'item:status:changed', payload);
        if (item.batch.session.tableId) {
            this.gateway.emitToTable(item.batch.session.tableId, 'item:status:changed', payload);
        }
        return updated;
    }
    async syncBatchStatus(batchId, restaurantId, tableId) {
        const items = await this.prisma.orderItem.findMany({
            where: { batchId },
            select: { status: true },
        });
        const active = items.filter((i) => i.status !== 'CANCELLED');
        if (active.length === 0)
            return;
        const statuses = active.map((i) => i.status);
        let newBatchStatus;
        if (statuses.every((s) => s === 'SERVED')) {
            newBatchStatus = 'SERVED';
        }
        else if (statuses.every((s) => s === 'PREPARED' || s === 'SERVED')) {
            newBatchStatus = 'READY';
        }
        else if (statuses.some((s) => s === 'PREPARING' || s === 'PREPARED')) {
            newBatchStatus = 'IN_PROGRESS';
        }
        else {
            newBatchStatus = 'PENDING';
        }
        const batch = await this.prisma.orderBatch.findUnique({
            where: { id: batchId },
            select: { status: true },
        });
        if (!batch || batch.status === newBatchStatus)
            return;
        await this.prisma.orderBatch.update({
            where: { id: batchId },
            data: { status: newBatchStatus },
        });
        const payload = {
            batchId,
            status: newBatchStatus,
            autoSync: true,
        };
        this.gateway.emitToKitchen(restaurantId, 'batch:status:changed', payload);
        this.gateway.emitToRestaurant(restaurantId, 'batch:status:changed', payload);
        if (tableId) {
            this.gateway.emitToTable(tableId, 'batch:status:changed', payload);
        }
    }
    async getKitchenView(actor, restaurantId) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const allowedRoles = [
            client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.CHEF,
        ];
        if (!allowedRoles.includes(actor.role)) {
            throw new common_1.ForbiddenException('Only CHEF and above can access the kitchen view');
        }
        return this.prisma.orderBatch.findMany({
            where: {
                session: { restaurantId },
                status: { in: ['PENDING', 'IN_PROGRESS', 'READY'] },
            },
            orderBy: { createdAt: 'asc' },
            include: {
                items: {
                    where: { status: { notIn: ['CANCELLED', 'SERVED'] } },
                    include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
                    orderBy: { createdAt: 'asc' },
                },
                session: {
                    select: {
                        id: true,
                        sessionNumber: true,
                        channel: true,
                        table: { select: { id: true, name: true } },
                    },
                },
                createdBy: { select: { id: true, name: true } },
            },
        });
    }
    async getBillingView(actor, restaurantId) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const allowedRoles = [
            client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.BILLER,
        ];
        if (!allowedRoles.includes(actor.role)) {
            throw new common_1.ForbiddenException('Only BILLER and above can access the billing view');
        }
        return this.prisma.orderSession.findMany({
            where: {
                restaurantId,
                status: { in: ['OPEN', 'BILLED'] },
            },
            orderBy: { createdAt: 'asc' },
            include: {
                table: { select: { id: true, name: true } },
                batches: {
                    select: {
                        _count: { select: { items: true } },
                        status: true,
                    },
                },
                bill: {
                    select: {
                        id: true,
                        billNumber: true,
                        status: true,
                        totalAmount: true,
                        payments: { select: { amount: true } },
                    },
                },
            },
        });
    }
    async generateBill(actor, restaurantId, sessionId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const allowedRoles = [
            client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.BILLER,
        ];
        if (!allowedRoles.includes(actor.role)) {
            throw new common_1.ForbiddenException('Only BILLER and above can generate bills');
        }
        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
            include: { bill: true },
        });
        if (!session)
            throw new common_1.NotFoundException(`Session ${sessionId} not found`);
        if (session.status !== 'OPEN') {
            throw new common_1.BadRequestException(`Session is already "${session.status}" — cannot regenerate bill`);
        }
        if (session.bill) {
            throw new common_1.ConflictException(`Bill ${session.bill.billNumber} already exists for this session. Use PATCH to update discount.`);
        }
        const items = await this.prisma.orderItem.findMany({
            where: {
                batch: { sessionId },
                status: { not: 'CANCELLED' },
            },
            include: { menuItem: { select: { id: true, name: true } } },
        });
        if (items.length === 0) {
            throw new common_1.BadRequestException('Cannot generate bill for a session with no items');
        }
        const grouped = new Map();
        for (const item of items) {
            const existing = grouped.get(item.menuItemId);
            if (existing) {
                existing.quantity += item.quantity;
                existing.totalPrice += Number(item.totalPrice);
            }
            else {
                grouped.set(item.menuItemId, {
                    name: item.menuItem.name,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice),
                    totalPrice: Number(item.totalPrice),
                });
            }
        }
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { taxRate: true },
        });
        const taxRate = Number(restaurant?.taxRate ?? 0);
        const subtotal = Array.from(grouped.values()).reduce((sum, i) => sum + i.totalPrice, 0);
        const discountAmount = Number(dto.discountAmount ?? 0);
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
        const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));
        const billNumber = await this.generateUniqueBillNumber(restaurantId);
        const bill = await this.prisma.$transaction(async (tx) => {
            const createdBill = await tx.bill.create({
                data: {
                    sessionId,
                    restaurantId,
                    billNumber,
                    subtotal,
                    taxRate,
                    taxAmount,
                    discountAmount,
                    totalAmount,
                    notes: dto.notes ?? null,
                    generatedById: actor.id,
                    items: {
                        create: Array.from(grouped.entries()).map(([menuItemId, v]) => ({
                            menuItemId,
                            name: v.name,
                            quantity: v.quantity,
                            unitPrice: v.unitPrice,
                            totalPrice: v.totalPrice,
                        })),
                    },
                },
                include: {
                    items: true,
                    payments: true,
                    generatedBy: { select: { id: true, name: true } },
                },
            });
            await tx.orderSession.update({
                where: { id: sessionId },
                data: {
                    status: 'BILLED',
                    subtotal,
                    taxAmount,
                    discountAmount,
                    totalAmount,
                },
            });
            return createdBill;
        });
        this.gateway.emitToBilling(restaurantId, 'bill:generated', bill);
        this.gateway.emitToRestaurant(restaurantId, 'session:status:changed', {
            sessionId,
            status: 'BILLED',
            billNumber,
        });
        this.logger.log(`Bill ${billNumber} generated for session ${session.sessionNumber}`);
        return bill;
    }
    async getBillForSession(actor, restaurantId, sessionId) {
        await this.assertRestaurantAccess(actor, restaurantId);
        const bill = await this.prisma.bill.findFirst({
            where: { sessionId, restaurantId },
            include: {
                items: { include: { menuItem: { select: { id: true, name: true } } } },
                payments: { orderBy: { createdAt: 'asc' } },
                generatedBy: { select: { id: true, name: true } },
                session: {
                    select: {
                        id: true,
                        sessionNumber: true,
                        channel: true,
                        customerName: true,
                        customerPhone: true,
                        table: { select: { id: true, name: true } },
                    },
                },
            },
        });
        if (!bill) {
            throw new common_1.NotFoundException(`No bill found for session ${sessionId}`);
        }
        return bill;
    }
    async addPayment(actor, billId, dto) {
        const bill = await this.prisma.bill.findUnique({
            where: { id: billId },
            include: {
                payments: { select: { amount: true } },
                session: {
                    select: {
                        restaurantId: true,
                        tableId: true,
                        sessionNumber: true,
                        id: true,
                    },
                },
            },
        });
        if (!bill)
            throw new common_1.NotFoundException(`Bill ${billId} not found`);
        if (bill.status === 'VOIDED') {
            throw new common_1.BadRequestException('Cannot add payment to a voided bill');
        }
        if (bill.status === 'PAID') {
            throw new common_1.BadRequestException('Bill is already fully paid');
        }
        const restaurantId = bill.session.restaurantId;
        await this.assertRestaurantAccess(actor, restaurantId);
        const allowedRoles = [
            client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.BILLER,
        ];
        if (!allowedRoles.includes(actor.role)) {
            throw new common_1.ForbiddenException('Only BILLER and above can record payments');
        }
        const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remaining = Number(bill.totalAmount) - totalPaid;
        const paymentAmount = Number(dto.amount);
        if (paymentAmount <= 0) {
            throw new common_1.BadRequestException('Payment amount must be positive');
        }
        if (paymentAmount > remaining + 0.01) {
            throw new common_1.BadRequestException(`Payment of ${paymentAmount} exceeds remaining balance of ${remaining.toFixed(2)}`);
        }
        const isFullyPaid = paymentAmount >= remaining - 0.01;
        const payment = await this.prisma.$transaction(async (tx) => {
            const created = await tx.payment.create({
                data: {
                    billId,
                    amount: paymentAmount,
                    method: dto.method,
                    reference: dto.reference ?? null,
                    notes: dto.notes ?? null,
                    processedById: actor.id,
                },
            });
            if (isFullyPaid) {
                await tx.bill.update({
                    where: { id: billId },
                    data: { status: 'PAID', paidAt: new Date() },
                });
                await tx.orderSession.update({
                    where: { id: bill.session.id },
                    data: { status: 'PAID', closedAt: new Date() },
                });
            }
            return created;
        });
        const payloadData = {
            billId,
            billNumber: bill.billNumber,
            sessionId: bill.session.id,
            amount: paymentAmount,
            method: dto.method,
            isFullyPaid,
            remainingBalance: isFullyPaid ? 0 : remaining - paymentAmount,
        };
        this.gateway.emitToBilling(restaurantId, 'payment:recorded', payloadData);
        this.gateway.emitToRestaurant(restaurantId, 'payment:recorded', payloadData);
        if (isFullyPaid) {
            if (bill.session.tableId) {
                await this.releaseTableIfNoOpenSessions(bill.session.tableId, bill.session.id);
            }
            this.gateway.emitToRestaurant(restaurantId, 'session:status:changed', {
                sessionId: bill.session.id,
                status: 'PAID',
            });
            this.gateway.emitToBilling(restaurantId, 'bill:paid', {
                billId,
                billNumber: bill.billNumber,
                sessionId: bill.session.id,
            });
            this.logger.log(`Bill ${bill.billNumber} fully paid on session ${bill.session.sessionNumber}`);
        }
        return { payment, isFullyPaid };
    }
    async getPaymentsForBill(actor, billId) {
        const bill = await this.prisma.bill.findUnique({
            where: { id: billId },
            select: { session: { select: { restaurantId: true } } },
        });
        if (!bill)
            throw new common_1.NotFoundException(`Bill ${billId} not found`);
        await this.assertRestaurantAccess(actor, bill.session.restaurantId);
        return this.prisma.payment.findMany({
            where: { billId },
            orderBy: { createdAt: 'asc' },
            include: { processedBy: { select: { id: true, name: true } } },
        });
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => orders_gateway_1.OrdersGateway))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        orders_gateway_1.OrdersGateway])
], OrdersService);
//# sourceMappingURL=orders.service.js.map