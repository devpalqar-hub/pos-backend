import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
    Logger,
    forwardRef,
    Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { BillStatus, ItemType, Prisma, TableStatus, User, UserRole } from '@prisma/client';
import { CreateSessionDto, OrderChannel } from './dto/create-session.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateItemStatusDto, } from './dto/update-item-status.dto';
import { OrderItemStatus } from '@prisma/client';
import { UpdateBatchStatusDto, BatchStatus } from './dto/update-batch-status.dto';
import { UpdateSessionStatusDto, SessionStatus } from './dto/update-session-status.dto';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { generateShortId } from './utils/id-generator';
import { OrdersGateway } from './orders.gateway';
import { evaluatePriceRule } from 'src/common/utlility/price-rule.helper';
import { validateSessionStatusTransition } from './utils/session-status-machine';
import { table } from 'console';

// ─── Include clauses ──────────────────────────────────────────────────────────

const SESSION_SUMMARY_INCLUDE = {
    table: { select: { id: true, name: true, seatCount: true, status: true } },
    openedBy: { select: { id: true, name: true, role: true } },
    orderSessionUpdateTimes: true,
    _count: { select: { batches: true } },
} as const;

const SESSION_DETAIL_INCLUDE = {
    table: { select: { id: true, name: true, seatCount: true, status: true, groupId: true } },
    openedBy: { select: { id: true, name: true, role: true } },
    batches: {
        orderBy: { createdAt: 'asc' as const },
        include: {
            createdBy: { select: { id: true, name: true, role: true } },
            items: {
                include: {
                    menuItem: { select: { id: true, name: true, imageUrl: true } },
                },
                orderBy: { createdAt: 'asc' as const },
            },
        },
    },
    bill: {
        include: {
            items: true,
            payments: { orderBy: { createdAt: 'asc' as const } },
            generatedBy: { select: { id: true, name: true } },
        },
    },
    orderSessionUpdateTimes: true,
} as const;

const BATCH_INCLUDE = {
    items: { include: { menuItem: { select: { id: true, name: true, imageUrl: true } } } },
    createdBy: { select: { id: true, name: true, role: true } },
} as const;

// ─── Allowed item status transitions ─────────────────────────────────────────
// Maps current status → allowed next statuses
const ITEM_STATUS_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
    [OrderItemStatus.PENDING]: [
        OrderItemStatus.PREPARING,
        OrderItemStatus.PREPARED,
        OrderItemStatus.SERVED,
        OrderItemStatus.CANCELLED,
    ],
    [OrderItemStatus.PREPARING]: [
        OrderItemStatus.PREPARED,
        OrderItemStatus.SERVED,
        OrderItemStatus.CANCELLED,
    ],
    [OrderItemStatus.PREPARED]: [OrderItemStatus.SERVED, OrderItemStatus.CANCELLED],
    [OrderItemStatus.SERVED]: [],
    [OrderItemStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => OrdersGateway))
        private readonly gateway: OrdersGateway,
    ) { }

    // =========================================================================
    // ACCESS HELPERS
    // =========================================================================

    private async assertRestaurantAccess(
        actor: User,
        restaurantId: string,
        mode: 'view' | 'manage' = 'view',
    ): Promise<void> {
        if (actor.role === UserRole.SUPER_ADMIN) return;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) {
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);
        }

        if (actor.role === UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new ForbiddenException('You do not own this restaurant');
            }
            return;
        }

        // All staff roles must be assigned to this restaurant
        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException('You are not assigned to this restaurant');
        }
    }

    private assertManageRole(actor: User): void {
        const manage: UserRole[] = [
            UserRole.SUPER_ADMIN,
            UserRole.OWNER,
            UserRole.RESTAURANT_ADMIN,
        ];
        if (!manage.includes(actor.role)) {
            throw new ForbiddenException(
                'Only RESTAURANT_ADMIN, OWNER, or SUPER_ADMIN can perform this action',
            );
        }
    }

    private mapSessionStatusToOrderStatus(status: SessionStatus) {
        const map = {
            OPEN: 'OPEN',
            BILLED: 'BILLED',
            PAID: 'PAID',
            CANCELLED: 'CANCELLED',
            VOID: 'VOID',
        };

        return map[status] ?? 'NEW';
    }

    // =========================================================================
    // SHORT ID GENERATORS (handle uniqueness via retry loop)
    // =========================================================================

    private async generateUniqueSessionNumber(restaurantId: string): Promise<string> {
        let id: string;
        let exists: boolean;
        do {
            id = generateShortId();
            const existing = await this.prisma.orderSession.findUnique({
                where: { restaurantId_sessionNumber: { restaurantId, sessionNumber: id } },
            });
            exists = !!existing;
        } while (exists);
        return id;
    }

    private async generateUniqueBatchNumber(sessionId: string): Promise<string> {
        let id: string;
        let exists: boolean;
        do {
            id = generateShortId();
            const existing = await this.prisma.orderBatch.findUnique({
                where: { sessionId_batchNumber: { sessionId, batchNumber: id } },
            });
            exists = !!existing;
        } while (exists);
        return id;
    }

    private async generateUniqueBillNumber(restaurantId: string): Promise<string> {
        let id: string;
        let exists: boolean;
        do {
            id = generateShortId();
            const existing = await this.prisma.bill.findUnique({
                where: { restaurantId_billNumber: { restaurantId, billNumber: id } },
            });
            exists = !!existing;
        } while (exists);
        return id;
    }

    // =========================================================================
    // EFFECTIVE PRICE (inline — avoids circular dep with PriceRulesService)
    // =========================================================================

    private async getEffectivePriceForItem(
        restaurantId: string,
        menuItemId: string,
    ): Promise<number> {
        const item = await this.prisma.menuItem.findFirst({
            where: { id: menuItemId, restaurantId },
            select: { price: true, discountedPrice: true },
        });
        if (!item) throw new NotFoundException(`Menu item ${menuItemId} not found`);

        const now = new Date();

        const rules = await this.prisma.priceRule.findMany({
            where: { restaurantId, menuItemId, isActive: true },
            include: { days: true },
            orderBy: [{ priority: 'desc' }],
        });

        const jsDay = now.getDay();
        const dayMap: Record<number, string> = {
            0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
            4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
        };
        const currentDayName = dayMap[jsDay];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const matchingRules = rules.filter((rule) => {
            if (rule.ruleType === 'LIMITED_TIME') {
                if (!rule.startDate || !rule.endDate) return false;
                if (now < rule.startDate || now > rule.endDate) return false;
            }
            if (rule.ruleType === 'RECURRING_WEEKLY') {
                if (!rule.days.some((d: any) => d.day === currentDayName)) return false;
            }
            if (rule.startTime && rule.endTime) {
                if (currentTime < rule.startTime || currentTime > rule.endTime) return false;
            }
            return true;
        });
        if (!matchingRules.length && item.discountedPrice) {
            return Number(item.discountedPrice);
        }
        if (!matchingRules.length) return Number(item.price);

        matchingRules.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            if (a.ruleType === 'LIMITED_TIME' && b.ruleType !== 'LIMITED_TIME') return -1;
            if (b.ruleType === 'LIMITED_TIME' && a.ruleType !== 'LIMITED_TIME') return 1;
            return 0;
        });

        return Number(matchingRules[0].specialPrice);
    }

    // =========================================================================
    // SESSION
    // =========================================================================

    async createSession(actor: User, restaurantId: string, dto: CreateSessionDto) {
        await this.assertRestaurantAccess(actor, restaurantId);

        // Only allowed roles
        const allowedCreators: UserRole[] = [
            UserRole.SUPER_ADMIN,
            UserRole.OWNER,
            UserRole.RESTAURANT_ADMIN,
            UserRole.WAITER,
        ];

        if (!allowedCreators.includes(actor.role)) {
            throw new ForbiddenException('You are not allowed to open order sessions');
        }

        // Validate table if provided
        if (dto.tableId) {
            const table = await this.prisma.table.findFirst({
                where: { id: dto.tableId, restaurantId },
            });

            if (!table) {
                throw new NotFoundException(
                    `Table ${dto.tableId} not found in restaurant ${restaurantId}`,
                );
            }

            if (!table.isActive) {
                throw new BadRequestException(`Table ${table.name} is inactive`);
            }
        }

        const sessionNumber = await this.generateUniqueSessionNumber(restaurantId);

        const session = await this.prisma.$transaction(async (tx) => {
            const session = await tx.orderSession.create({
                data: {
                    restaurantId,
                    tableId: dto.tableId ?? null,
                    sessionNumber,
                    channel: (dto.channel ?? OrderChannel.DINE_IN) as any,
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

            await tx.orderSessionUpdateTime.create({
                data: {
                    orderSessionId: session.id,
                    updatedAt: session.createdAt,
                    fieldChanged: "order status",
                    oldValue: null,
                    newValue: session.status
                },
            });

            // Refetch session to include the new update time
            const sessionWithUpdateTimes = await tx.orderSession.findUnique({
                where: { id: session.id },
                include: SESSION_SUMMARY_INCLUDE,
            });

            console.log("session update time", sessionWithUpdateTimes?.orderSessionUpdateTimes);
            console.log("helooo");
            // 3. Update table status if applicable
            if (dto.tableId) {
                await tx.table.update({
                    where: { id: dto.tableId },
                    data: { status: 'OCCUPIED' as any },
                });
            }

            return sessionWithUpdateTimes;
        });

        // 4. Emit events (outside transaction)
        if (dto.tableId) {
            this.gateway.emitTableStatus(dto.tableId, restaurantId, 'OCCUPIED');
        }

        this.gateway.emitToRestaurant(restaurantId, 'session:opened', session);

        this.logger.log(
            `Session ${session?.sessionNumber} opened by ${actor.name} (${actor.role}) in restaurant ${restaurantId}`,
        );
        return session;
    }

    async findAllSessions(
        actor: User,
        restaurantId: string,
        filters?: { status?: SessionStatus; tableId?: string; channel?: string },
        page: number = 1,
        limit: number = 10,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const where: any = { restaurantId };
        if (filters?.status) where.status = filters.status;
        if (filters?.tableId) where.tableId = filters.tableId;
        if (filters?.channel) where.channel = filters.channel;

        return paginate({
            prismaModel: this.prisma.orderSession,
            page,
            limit,
            where,
            orderBy: { createdAt: 'desc' },
            include: SESSION_SUMMARY_INCLUDE,
        });
    }

    async findOneSession(actor: User, restaurantId: string, sessionId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
            include: SESSION_DETAIL_INCLUDE,
        });
        if (!session) {
            throw new NotFoundException(`Session ${sessionId} not found`);
        }
        return session;
    }

    async updateSessionStatus(
        actor: User,
        restaurantId: string,
        sessionId: string,
        dto: UpdateSessionStatusDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);
        this.assertManageRole(actor);

        const result = await this.prisma.$transaction(async (tx) => {
            const session = await tx.orderSession.findFirst({
                where: { id: sessionId, restaurantId },
            });

            if (!session) {
                throw new NotFoundException(`Session ${sessionId} not found`);
            }

            // ✅ VALIDATE STATE MACHINE: Enforce strict status transitions
            validateSessionStatusTransition(session.status as SessionStatus, dto.status);

            const updated = await tx.orderSession.update({
                where: { id: sessionId },
                data: {
                    status: dto.status as any,
                    ...(dto.status === SessionStatus.PAID ||
                        dto.status === SessionStatus.CANCELLED ||
                        dto.status === SessionStatus.VOID
                        ? { closedAt: new Date() }
                        : {}),
                },
                include: SESSION_SUMMARY_INCLUDE,
            });


            await tx.orderSessionUpdateTime.create({
                data: {
                    orderSessionId: session.id,
                    fieldChanged: "order status",
                    oldValue: session.status,
                    newValue: updated.status
                },
            });

            // Release table if needed
            if (
                session.tableId &&
                [SessionStatus.PAID, SessionStatus.CANCELLED, SessionStatus.VOID].includes(dto.status)
            ) {
                await this.releaseTableIfNoOpenSessions(session.tableId, sessionId);
            }

            return updated;
        });

        // Emit outside transaction
        this.gateway.emitToRestaurant(restaurantId, 'session:status:changed', {
            sessionId,
            status: dto.status,
        });

        return result;
    }

    /**
     * Release the table back to AVAILABLE if there are no remaining OPEN sessions on it
     * (excluding the session being closed, identified by closingSessionId).
     */
    private async releaseTableIfNoOpenSessions(
        tableId: string,
        closingSessionId: string,
    ): Promise<void> {
        const openCount = await this.prisma.orderSession.count({
            where: {
                tableId,
                status: 'OPEN' as any,
                id: { not: closingSessionId },
            },
        });

        if (openCount === 0) {
            const table = await this.prisma.table.update({
                where: { id: tableId },
                data: { status: 'AVAILABLE' as any },
                select: { restaurantId: true },
            });
            this.gateway.emitTableStatus(tableId, table.restaurantId, 'AVAILABLE');
        }
    }

    // =========================================================================
    // BATCH
    // =========================================================================

    async addBatch(
        actor: User,
        restaurantId: string,
        sessionId: string,
        dto: CreateBatchDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        // Only WAITER, RESTAURANT_ADMIN, OWNER, SUPER_ADMIN can add batches
        const allowedRoles: UserRole[] = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.WAITER,
        ];
        if (!allowedRoles.includes(actor.role)) {
            throw new ForbiddenException('You are not allowed to add batches');
        }

        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
        });
        if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
        if (session.status !== 'OPEN') {
            throw new BadRequestException(
                `Cannot add items to a session with status "${session.status}"`,
            );
        }

        if (!dto.items || dto.items.length === 0) {
            throw new BadRequestException('At least one item is required in a batch');
        }

        // Validate all menu items and compute prices
        const resolvedItems: Array<{
            menuItemId: string;
            quantity: number;
            notes?: string;
            unitPrice: number;
            totalPrice: number;
        }> = [];

        for (const item of dto.items) {
            const menuItem = await this.prisma.menuItem.findFirst({
                where: { id: item.menuItemId, restaurantId, isActive: true },
            });

            if (!menuItem) {
                throw new NotFoundException(
                    `Menu item ${item.menuItemId} not found or inactive in this restaurant`,
                );
            }

            if (!menuItem.isAvailable) {
                throw new BadRequestException(
                    `Menu item "${menuItem.name}" is not available`,
                );
            }

            if (menuItem.isOutOfStock) {
                throw new BadRequestException(
                    `Menu item "${menuItem.name}" is out of stock`,
                );
            }

            // ✅ STOCK VALIDATION + DEDUCTION (only for STOCKABLE items)
            if (menuItem.itemType === ItemType.STOCKABLE) {
                const availableStock = menuItem.stockCount ?? 0;

                if (availableStock <= 0) {
                    throw new BadRequestException(
                        `Menu item "${menuItem.name}" is out of stock`,
                    );
                }

                if (item.quantity > availableStock) {
                    throw new BadRequestException(
                        `Only ${availableStock} units of "${menuItem.name}" available, but ${item.quantity} requested`,
                    );
                }

                const newStock = availableStock - item.quantity;

                await this.prisma.menuItem.update({
                    where: { id: item.menuItemId },
                    data: {
                        stockCount: newStock,
                        isOutOfStock: newStock === 0,
                        outOfStockAt: newStock === 0 ? new Date() : null,
                    },
                });
            }

            const unitPrice = await this.getEffectivePriceForItem(
                restaurantId,
                item.menuItemId,
            );

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
                    include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
                },
                createdBy: { select: { id: true, name: true, role: true } },
                session: { select: { id: true, sessionNumber: true, tableId: true, restaurantId: true } },
            },
        });


        // Fetch all OPEN sessions for the restaurant
        const openSessions = await this.prisma.orderSession.findMany({
            where: { restaurantId, status: 'OPEN' },
            select: { id: true },
        });
        const openSessionIds = openSessions.map(s => s.id);

        // Fetch all PENDING batches for those sessions
        const pendingBatches = await this.prisma.orderBatch.findMany({
            where: {
                sessionId: { in: openSessionIds },
                status: 'PENDING',
            },
            include: {
                items: {
                    include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
                },
                createdBy: { select: { id: true, name: true, role: true } },
                session: { select: { id: true, sessionNumber: true, tableId: true, restaurantId: true } },
            },
        });

        // ✅ ONLY emit the newly created batch
        this.gateway.emitToKitchen(restaurantId, 'batch:created', batch);

        // restaurant UI (optional)
        this.gateway.emitToRestaurant(restaurantId, 'batch:created', batch);

        // table UI (FIXED: you had wrong emit here)
        if (session.tableId) {
            this.gateway.emitToTable(session.tableId, 'batch:created', batch);
        }

        this.logger.log(
            `Batch ${batchNumber} created in session ${session.sessionNumber} by ${actor.name}`,
        );

        return batch;
    }

    async findAllBatches(
        actor: User,
        restaurantId: string,
        sessionId: string,
        page: number = 1,
        limit: number = 10,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
        });
        if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

        return paginate({
            prismaModel: this.prisma.orderBatch,
            page,
            limit,
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
            include: BATCH_INCLUDE,
        });
    }

    async updateBatchStatus(
        actor: User,
        batchId: string,
        dto: UpdateBatchStatusDto,
    ) {
        const batch = await this.prisma.orderBatch.findUnique({
            where: { id: batchId },
            include: { session: { select: { restaurantId: true, tableId: true, sessionNumber: true } } },
        });
        if (!batch) throw new NotFoundException(`Batch ${batchId} not found`);

        await this.assertRestaurantAccess(actor, batch.session.restaurantId);

        const updated = await this.prisma.orderBatch.update({
            where: { id: batchId },
            data: { status: dto.status as any },
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
        console.log("batch status changed successfully emitted to kitchen and restaurant");
        if (batch.session.tableId) {
            this.gateway.emitToTable(batch.session.tableId, 'batch:status:changed', {
                batchId,
                status: dto.status,
                sessionId: batch.sessionId,
            });
        }

        return updated;
    }

    // =========================================================================
    // ORDER ITEM STATUS
    // =========================================================================

    async updateItemStatus(
        actor: User,
        itemId: string,
        dto: UpdateItemStatusDto,
    ) {
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
        if (!item) throw new NotFoundException(`Order item ${itemId} not found`);

        const restaurantId = item.batch.session.restaurantId;
        await this.assertRestaurantAccess(actor, restaurantId);

        // Validate transition
        const currentStatus = item.status as unknown as OrderItemStatus;
        const allowed = ITEM_STATUS_TRANSITIONS[currentStatus];
        if (!allowed.includes(dto.status)) {
            throw new BadRequestException(
                `Cannot transition item from "${currentStatus}" to "${dto.status}"`,
            );
        }

        // Role-based transition restrictions
        if (
            dto.status === OrderItemStatus.PREPARING ||
            dto.status === OrderItemStatus.PREPARED
        ) {
            if (
                actor.role !== UserRole.CHEF &&
                actor.role !== UserRole.SUPER_ADMIN &&
                actor.role !== UserRole.OWNER &&
                actor.role !== UserRole.RESTAURANT_ADMIN &&
                actor.role !== UserRole.WAITER
            ) {
                throw new ForbiddenException('Only CHEF can mark items as PREPARING or PREPARED');
            }
        }

        if (dto.status === OrderItemStatus.SERVED) {
            if (
                actor.role !== UserRole.WAITER &&
                actor.role !== UserRole.SUPER_ADMIN &&
                actor.role !== UserRole.OWNER &&
                actor.role !== UserRole.RESTAURANT_ADMIN &&
                actor.role !== UserRole.CHEF
            ) {
                throw new ForbiddenException('Only WAITER can mark items as SERVED');
            }
        }

        if (dto.status === OrderItemStatus.CANCELLED && !dto.cancelReason) {
            throw new BadRequestException('cancelReason is required when cancelling an item');
        }

        const updated = await this.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                status: dto.status as any,
                ...(dto.status === OrderItemStatus.PREPARED && { preparedAt: new Date() }),
                ...(dto.status === OrderItemStatus.SERVED && { servedAt: new Date() }),
                ...(dto.status === OrderItemStatus.CANCELLED && {
                    cancelledAt: new Date(),
                    cancelReason: dto.cancelReason,
                }),
            },
            include: {
                menuItem: { select: { id: true, name: true, imageUrl: true } },
                batch: { select: { id: true, batchNumber: true, sessionId: true } },
            },
        });

        // Auto-sync batch status based on all items
        await this.syncBatchStatus(item.batchId, restaurantId, item.batch.session.tableId);

        const payload = {
            itemId,
            status: dto.status,
            batchId: item.batchId,
            sessionId: item.batch.session.id,
        };

        this.gateway.emitToKitchen(restaurantId, 'item:status:changed', payload);
        this.gateway.emitToBilling(restaurantId, 'item:status:changed', payload);
        this.gateway.emitToRestaurant(restaurantId, 'item:status:changed', payload);
        if (item.batch.session.tableId) {
            this.gateway.emitToTable(item.batch.session.tableId, 'item:status:changed', payload);
        }

        return updated;
    }

    /**
     * Automatically update batch status based on the collective status of its items.
     * PENDING  → items still pending
     * IN_PROGRESS → at least one PREPARING
     * READY    → all non-cancelled items PREPARED (or SERVED)
     * SERVED   → all non-cancelled items SERVED
     */
    private async syncBatchStatus(
        batchId: string,
        restaurantId: string,
        tableId: string | null,
    ): Promise<void> {
        const items = await this.prisma.orderItem.findMany({
            where: { batchId },
            select: { status: true },
        });

        const active = items.filter((i) => i.status !== 'CANCELLED');
        if (active.length === 0) return; // All cancelled — leave batch as-is

        const statuses = active.map((i) => i.status as string);
        let newBatchStatus: string;

        if (statuses.every((s) => s === 'SERVED')) {
            newBatchStatus = 'SERVED';
        } else if (statuses.every((s) => s === 'PREPARED' || s === 'SERVED')) {
            newBatchStatus = 'READY';
        } else if (statuses.some((s) => s === 'PREPARING' || s === 'PREPARED')) {
            newBatchStatus = 'IN_PROGRESS';
        } else {
            newBatchStatus = 'PENDING';
        }

        const batch = await this.prisma.orderBatch.findUnique({
            where: { id: batchId },
            select: { status: true },
        });
        if (!batch || (batch.status as string) === newBatchStatus) return;

        await this.prisma.orderBatch.update({
            where: { id: batchId },
            data: { status: newBatchStatus as any },
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

    // =========================================================================
    // KITCHEN VIEW
    // =========================================================================

    async getKitchenView(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        // Only chef/admin/owner gets kitchen view
        const allowedRoles = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.CHEF,
        ];
        if (!(allowedRoles as UserRole[]).includes(actor.role)) {
            throw new ForbiddenException('Only CHEF and above can access the kitchen view');
        }

        return this.prisma.orderBatch.findMany({
            where: {
                session: { restaurantId },
                status: { in: ['PENDING', 'IN_PROGRESS', 'READY'] as any },
            },
            orderBy: { createdAt: 'asc' },
            include: {
                items: {
                    where: { status: { notIn: ['CANCELLED', 'SERVED'] as any } },
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

    // =========================================================================
    // BILLING VIEW
    // =========================================================================

    async getBillingView(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const allowedRoles = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.BILLER,
        ] as UserRole[];
        if (!(allowedRoles as UserRole[]).includes(actor.role)) {
            throw new ForbiddenException('Only BILLER and above can access the billing view');
        }

        return this.prisma.orderSession.findMany({
            where: {
                restaurantId,
                status: { in: ['OPEN', 'BILLED'] as any },
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

    // =========================================================================
    // BILL GENERATION
    // =========================================================================

    async generateBill(
        actor: User,
        restaurantId: string,
        sessionId: string,
        dto: GenerateBillDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const allowedRoles = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.BILLER,
        ];
        if (!(allowedRoles as UserRole[]).includes(actor.role)) {
            throw new ForbiddenException('Only BILLER and above can generate bills');
        }

        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
            include: { bill: true },
        });
        if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
        if (session.status !== 'OPEN' && session.status !== 'BILLED') {
            throw new BadRequestException(`Session is already "${session.status}" — cannot regenerate bill`);
        }
        if (session.bill) {
            throw new ConflictException(
                `Bill ${session.bill.billNumber} already exists for this session. Use PATCH to update discount.`,
            );
        }

        const hasCustomerDataInRequest = Boolean(
            dto.customerName?.trim() || dto.customerEmail?.trim() || dto.customerPhone?.trim(),
        );

        // Validate that loyalty operations require customer data
        if ((dto.claimedLoyalityPoints || dto.loyalityOfferId) && !hasCustomerDataInRequest) {
            throw new BadRequestException('Customer details (name, email, or phone) are required to use loyalty points or redemption offers');
        }

        // Collect all non-cancelled items from all batches
        const items = await this.prisma.orderItem.findMany({
            where: {
                batch: { sessionId },
                status: { not: 'CANCELLED' as any },
            },
            include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
        });

        if (items.length === 0) {
            throw new BadRequestException('Cannot generate bill for a session with no items');
        }

        // Aggregate by menuItem
        const grouped = new Map<
            string,
            {
                name: string;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                specialApplied?: boolean;
                appliedRuleId?: string;
                // ✅ RAW STATUSES (no processing)
                statuses: OrderItemStatus[];
            }
        >
        let isAnySpecialPriceApplied = false;
        let appliedPriceRuleId: string | null = null;
        for (const item of items) {
            // 🔥 Apply price rule
            const priceRuleResult = await evaluatePriceRule(
                item.menuItemId,
                restaurantId,
            );

            const finalUnitPrice = priceRuleResult.isApplicable
                ? Number(priceRuleResult.specialPrice)
                : Number(item.unitPrice);

            const finalTotalPrice = finalUnitPrice * item.quantity;

            const existing = grouped.get(item.menuItemId);

            if (existing) {
                existing.quantity += item.quantity;
                existing.totalPrice += finalTotalPrice;

                // ✅ PUSH RAW STATUS
                existing.statuses.push(item.status);

                if (priceRuleResult.isApplicable) {
                    existing.specialApplied = true;
                    existing.appliedRuleId = priceRuleResult.appliedRuleId;
                }
            } else {
                grouped.set(item.menuItemId, {
                    name: item.menuItem.name,
                    quantity: item.quantity,
                    unitPrice: finalUnitPrice,
                    totalPrice: finalTotalPrice,
                    appliedRuleId: priceRuleResult.appliedRuleId,
                    specialApplied: priceRuleResult.isApplicable,

                    // ✅ INIT WITH RAW STATUS
                    statuses: [item.status],
                });
            }

            // 🔥 Bill-level tracking
            if (priceRuleResult.isApplicable) {
                isAnySpecialPriceApplied = true;

                if (!appliedPriceRuleId) {
                    appliedPriceRuleId = priceRuleResult.appliedRuleId!;
                }
            }
        }

        const subtotal = Array.from(grouped.values()).reduce(
            (sum, i) => sum + i.totalPrice,
            0,
        );

        // ================================
        // STEP 2: COUPON LOGIC
        // ================================

        let couponDiscount = 0;
        let appliedCoupon: any = null; // ✅ ADD

        if (dto.couponName) {
            if (!hasCustomerDataInRequest) {
                throw new BadRequestException('Customer details (name, email, or phone) are required to apply a coupon');
            }
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    code: dto.couponName,
                    restaurantId,
                    isActive: true,
                },
            });

            if (!coupon) throw new NotFoundException('Coupon not found');

            const now = new Date();

            if (now < coupon.validFrom || now > coupon.validUntil) {
                throw new BadRequestException('Coupon expired or not yet active');
            }

            if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
                throw new BadRequestException(
                    `Minimum order amount ${coupon.minOrderAmount} required`,
                );
            }

            if (coupon.discountType === 'PERCENTAGE') {
                couponDiscount = subtotal * (Number(coupon.discountValue) / 100);
            } else {
                couponDiscount = Number(coupon.discountValue);
            }

            if (coupon.maxDiscount) {
                couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
            }

            // ✅ STORE FOR RESPONSE
            appliedCoupon = {
                id: coupon.id,
                code: coupon.code,
                name: coupon.name,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue.toString(),
                maxDiscount: coupon.maxDiscount?.toString() ?? null,
                appliedDiscount: couponDiscount.toString(),
            };
        }


        // ================================
        // STEP 3: LOYALTY POINTS
        // ================================

        let loyaltyDiscount = 0;
        let appliedLoyalty: any = null; // ✅ ADD
        let loyaltyPointsToConsume = 0;
        let loyaltyEligibleAmount = 0;
        let customer: any;
        let selectedLoyalityOffer: any = null;
        if (hasCustomerDataInRequest) {
            const customerLookup: any = { restaurantId };
            const lookupConditions: Array<{ email?: string; phone?: string }> = [];

            if (dto.customerEmail) {
                lookupConditions.push({ email: dto.customerEmail });
            }
            if (dto.customerPhone) {
                lookupConditions.push({ phone: dto.customerPhone });
            }

            if (lookupConditions.length > 0) {
                customerLookup.OR = lookupConditions;
            }

            customer = await this.prisma.customer.findFirst({
                where: customerLookup,
            });

            if (!customer) {
                customer = await this.prisma.customer.create({
                    data: {
                        restaurantId,
                        name: dto.customerName ?? 'Guest',
                        email: dto.customerEmail ?? null,
                        phone: dto.customerPhone ?? '',
                    },
                });
            }

            if (dto.claimedLoyalityPoints && !customer) {
                throw new BadRequestException(
                    'Customer must exist to redeem loyalty points',
                );
            }
            if (dto.claimedLoyalityPoints) {
                const now = new Date();
                if (dto.loyalityOfferId) {
                    selectedLoyalityOffer = await this.prisma.loyalityOffer.findFirst({
                        where: {
                            id: dto.loyalityOfferId,
                            restaurantId,
                            isActive: true,
                            AND: [
                                { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                                { OR: [{ validTo: null }, { validTo: { gte: now } }] },
                            ],
                        },
                        include: {
                            menuItems: { select: { id: true, name: true } },
                        },
                    });

                    if (!selectedLoyalityOffer) {
                        throw new NotFoundException('Loyalty offer not found');
                    }
                }

                let conversionRate = 0;
                let converter: any = null;

                // grossAmount is calculated after this block in previewBill,
                // so we use subtotal + estimated tax as a safe cap here
                const taxRateTemp = Number(
                    (await this.prisma.restaurant.findUnique({
                        where: { id: restaurantId },
                        select: { taxRate: true },
                    }))?.taxRate ?? 0,
                );
                const grossAmountTemp = parseFloat(
                    (subtotal + (subtotal * taxRateTemp) / 100).toFixed(2),
                );
                const manualDiscountTemp = Number(dto.discountAmount ?? 0);

                const remainingAfterOtherDiscounts = Math.max(
                    0,
                    grossAmountTemp - manualDiscountTemp - couponDiscount,
                );
                loyaltyEligibleAmount = remainingAfterOtherDiscounts;

                const amountConditionFilter = {
                    AND: [
                        {
                            OR: [
                                { conditionMinAmount: null },
                                { conditionMinAmount: { lte: loyaltyEligibleAmount } },
                            ],
                        },
                        {
                            OR: [
                                { conditionMaxAmount: null },
                                { conditionMaxAmount: { gte: loyaltyEligibleAmount } },
                            ],
                        },
                    ],
                };

                const redemptions = await this.prisma.loyalityPointRedemption.findMany({
                    where: {
                        customerId: customer.id,
                        loyalityPoint: {
                            restaurantId,
                            isActive: true,
                            OR: [
                                { endDate: null },
                                { endDate: { gte: now } },
                            ],
                            ...amountConditionFilter,
                        } as any,
                    },
                    include: {
                        loyalityPoint: {
                            select: { id: true, name: true },
                        },
                    },
                });

                const totalPoints = redemptions.reduce(
                    (sum, r) => sum + Number(r.pointsAwarded),
                    0,
                );

                let pointsConsumed = 0;

                if (selectedLoyalityOffer) {
                    const offerPointsRequired = Number(selectedLoyalityOffer.pointsRequired);
                    if (totalPoints < offerPointsRequired) {
                        throw new BadRequestException(
                            'Not enough loyalty points for the selected offer',
                        );
                    }

                    if (selectedLoyalityOffer.type === 'AMOUNT') {
                        const offerAmount = Number(selectedLoyalityOffer.redeemAmount ?? 0);
                        if (offerAmount <= 0) {
                            throw new BadRequestException(
                                'Selected amount offer is not configured correctly',
                            );
                        }

                        loyaltyDiscount = parseFloat(
                            Math.min(offerAmount, remainingAfterOtherDiscounts).toFixed(2),
                        );
                        pointsConsumed = offerPointsRequired;
                    } else {
                        const eligibleBillItem = items.find((item) =>
                            selectedLoyalityOffer.menuItems.some(
                                (menuItem: { id: string }) =>
                                    menuItem.id === item.menuItemId,
                            ),
                        );

                        if (!eligibleBillItem) {
                            throw new BadRequestException(
                                'Selected food offer does not match any item in this bill',
                            );
                        }

                        loyaltyDiscount = parseFloat(
                            Math.min(Number(eligibleBillItem.unitPrice), remainingAfterOtherDiscounts).toFixed(2),
                        );
                        pointsConsumed = offerPointsRequired;
                    }
                } else {
                    converter = await this.prisma.loyalityPointsConverter.findFirst({
                        where: {
                            restaurantId,
                            isActive: true,
                        },
                    });

                    if (!converter) {
                        throw new BadRequestException('Loyalty converter not configured');
                    }

                    conversionRate = Number(converter.value) / Number(converter.points);

                    const maxPossibleDiscount = parseFloat(
                        (totalPoints * conversionRate).toFixed(2),
                    );

                    loyaltyDiscount = parseFloat(
                        Math.min(maxPossibleDiscount, remainingAfterOtherDiscounts).toFixed(2),
                    );

                    pointsConsumed = Math.ceil(loyaltyDiscount / conversionRate);
                }

                loyaltyPointsToConsume = pointsConsumed;
                const pointsRemaining = totalPoints - pointsConsumed;

                // ✅ STORE FOR RESPONSE
                appliedLoyalty = {
                    customerId: customer.id,
                    customerName: customer.name,
                    totalPoints,
                    pointsConsumed,
                    pointsRemaining,
                    convertedAmount: loyaltyDiscount.toString(),
                    conversionRate: conversionRate.toString(),
                    selectedLoyalityOffer: selectedLoyalityOffer
                        ? {
                            id: selectedLoyalityOffer.id,
                            name: selectedLoyalityOffer.name,
                            type: selectedLoyalityOffer.type,
                            pointsRequired: selectedLoyalityOffer.pointsRequired.toString(),
                            redeemAmount: selectedLoyalityOffer.redeemAmount?.toString() ?? null,
                        }
                        : null,
                    redemptions: redemptions.map((r) => ({
                        id: r.id,
                        points: r.pointsAwarded.toString(),
                        loyalityPoint: {
                            id: r.loyalityPoint.id,
                            name: r.loyalityPoint.name,
                        },
                    })),
                };
            }
        }


        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { taxRate: true },
        });
        const taxRate = Number(restaurant?.taxRate ?? 0);
        const manualDiscount = Number(dto.discountAmount ?? 0);
        const totalDiscount = manualDiscount + couponDiscount + loyaltyDiscount;

        // Step 1: Tax on full subtotal
        const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));

        // Step 2: Gross amount (before discount)
        const grossAmount = subtotal + taxAmount;

        // Step 3: Apply discounts AFTER tax
        const totalAmount = parseFloat(
            Math.max(0, grossAmount - totalDiscount).toFixed(2),
        );
        const billNumber = await this.generateUniqueBillNumber(restaurantId);
        let customerId: string | null = customer?.id ?? null;

        const bill = await this.prisma.$transaction(async (tx) => {

            // ================================
            // STEP X: CUSTOMER CREATE / FETCH
            // ================================
            const createdBill = await tx.bill.create({
                data: {
                    sessionId,
                    restaurantId,
                    billNumber,
                    subtotal,
                    grossAmount: grossAmount,
                    taxRate,
                    taxAmount,
                    status: BillStatus.PAID,
                    customerEmail: dto.customerEmail ?? null,
                    customerPhone: dto.customerPhone ?? null,
                    customerName: dto.customerName ?? null,
                    discountAmount: totalDiscount,
                    coupounDiscountAmount: couponDiscount,
                    loyalityPointDiscountAmount: loyaltyDiscount,
                    couponId: appliedCoupon?.id ?? null,
                    totalAmount,
                    notes: dto.notes ?? null,
                    generatedById: actor.id,
                    customerId: customerId,
                    SpecialPriceApplied: isAnySpecialPriceApplied,
                    priceruleId: appliedPriceRuleId,
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

                    coupon: true,
                    loyalityPointRedemption: true,

                    session: {
                        include: {
                            batches: {
                                include: {
                                    items: {
                                        include: {
                                            menuItem: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            // Update session pricing snapshot and status
            await tx.orderSession.update({
                where: { id: sessionId },
                data: {
                    status: 'PAID' as any,
                    subtotal,
                    taxAmount,
                    discountAmount: totalDiscount,
                    totalAmount,
                },
            });

            await tx.orderSessionUpdateTime.create({
                data: {
                    orderSessionId: session.id,
                    updatedAt: session.createdAt,
                    fieldChanged: "order status",
                    oldValue: session.status,
                    newValue: SessionStatus.PAID
                },
            });

            // Consume only the exact number of loyalty points needed for this bill.
            if (dto.claimedLoyalityPoints && customer?.id && loyaltyPointsToConsume > 0) {
                const now = new Date();
                const redemptionRows = await tx.loyalityPointRedemption.findMany({
                    where: {
                        customerId: customer.id,
                        loyalityPoint: {
                            restaurantId,
                            isActive: true,
                            OR: [{ endDate: null }, { endDate: { gte: now } }],
                            AND: [
                                {
                                    OR: [
                                        { conditionMinAmount: null },
                                        { conditionMinAmount: { lte: loyaltyEligibleAmount } },
                                    ],
                                },
                                {
                                    OR: [
                                        { conditionMaxAmount: null },
                                        { conditionMaxAmount: { gte: loyaltyEligibleAmount } },
                                    ],
                                },
                            ],
                        } as any,
                    },
                    orderBy: { redeemedAt: 'asc' },
                    select: {
                        id: true,
                        pointsAwarded: true,
                    },
                });

                let remainingPointsToConsume = loyaltyPointsToConsume;

                for (const row of redemptionRows) {
                    if (remainingPointsToConsume <= 0) break;

                    const rowPoints = Number(row.pointsAwarded);
                    const consumeFromRow = Math.min(rowPoints, remainingPointsToConsume);
                    const updatedPoints = parseFloat((rowPoints - consumeFromRow).toFixed(2));

                    if (updatedPoints <= 0) {
                        await tx.loyalityPointRedemption.delete({ where: { id: row.id } });
                    } else {
                        await tx.loyalityPointRedemption.update({
                            where: { id: row.id },
                            data: { pointsAwarded: new Prisma.Decimal(updatedPoints) },
                        });
                    }

                    remainingPointsToConsume = parseFloat(
                        (remainingPointsToConsume - consumeFromRow).toFixed(2),
                    );
                }

                if (remainingPointsToConsume > 0) {
                    throw new ConflictException(
                        'Loyalty points changed during billing. Please retry bill generation.',
                    );
                }

                // Decrement customer's loyalty wallet by the points consumed
                await tx.customer.update({
                    where: { id: customer.id },
                    data: {
                        loyaltyWallet: {
                            decrement: new Prisma.Decimal(loyaltyPointsToConsume),
                        },
                    },
                });
            }

            // Award loyalty points for this paid bill (if customer exists)
            if (customerId) {
                await this.awardLoyaltyPointsForPaidBill(
                    tx,
                    restaurantId,
                    createdBill.id,
                    customerId,
                    Number(createdBill.totalAmount),
                );
            }

            return createdBill;
        });

        if (session.tableId) {
            const sessions = await this.prisma.orderSession.findMany({
                where: {
                    restaurantId,
                    tableId: session.tableId,
                    status: {
                        notIn: [SessionStatus.PAID, SessionStatus.BILLED, SessionStatus.CANCELLED],
                    },
                },
            });

            // If there are no sessions with status other than PAID, mark the table as available
            if (sessions.length === 0) {
                await this.prisma.table.update({
                    where: { id: session.tableId },
                    data: { status: TableStatus.AVAILABLE },
                });
            }
        }

        this.gateway.emitToBilling(restaurantId, 'bill:generated', bill);
        this.gateway.emitToRestaurant(restaurantId, 'session:status:changed', {
            sessionId,
            status: 'PAID',
            billNumber,
        });
        console.log(`Bill ${billNumber} generated and events emitted successfully`);

        this.logger.log(`Bill ${billNumber} generated for session ${session.sessionNumber}`);
        return {
            ...bill,
            coupon: appliedCoupon,
            loyalty: appliedLoyalty,
        };
    }

    async getBillForSession(
        actor: User,
        restaurantId: string,
        sessionId: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const bill = await this.prisma.bill.findFirst({
            where: { sessionId, restaurantId },
            include: {
                items: { include: { menuItem: { select: { id: true, name: true, imageUrl: true } } } },
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
            throw new NotFoundException(`No bill found for session ${sessionId}`);
        }

        return bill;
    }

    async previewBill(
        actor: User,
        restaurantId: string,
        sessionId: string,
        dto: GenerateBillDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const allowedRoles = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.BILLER,
        ];
        if (!(allowedRoles as UserRole[]).includes(actor.role)) {
            throw new ForbiddenException('Only BILLER and above can generate bills');
        }

        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
            include: {
                table: { select: { id: true, name: true } },
                bill: true
            },
        });

        if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
        if (session.status !== 'OPEN') {
            throw new BadRequestException(`Session is already "${session.status}"`);
        }
        if (session.bill) {
            throw new ConflictException(
                `Bill ${session.bill.billNumber} already exists for this session. Use PATCH to update discount.`,
            );
        }

        const hasCustomerDataInRequest = Boolean(
            dto.customerName?.trim() || dto.customerEmail?.trim() || dto.customerPhone?.trim(),
        );

        // Validate that loyalty operations require customer data
        if ((dto.claimedLoyalityPoints || dto.loyalityOfferId) && !hasCustomerDataInRequest) {
            throw new BadRequestException('Customer details (name, email, or phone) are required to use loyalty points or redemption offers');
        }


        // ================================
        // ITEMS
        // ================================

        const items = await this.prisma.orderItem.findMany({
            where: {
                batch: { sessionId },
                status: { not: 'CANCELLED' as any },
            },
            include: {
                menuItem: { select: { id: true, name: true, imageUrl: true } },
            },
        });

        if (items.length === 0) {
            throw new BadRequestException('No items in session');
        }

        const grouped = new Map<
            string,
            {
                name: string;
                quantity: number;
                unitPrice: number;
                totalPrice: number;
                appliedRuleId?: string;
                specialApplied: boolean;

                // ✅ RAW STATUSES (no processing)
                statuses: OrderItemStatus[];
            }
        >();

        let isAnySpecialPriceApplied = false;
        let appliedPriceRuleId: string | null = null;

        for (const item of items) {
            // 🔥 Evaluate price rule
            const priceRuleResult = await evaluatePriceRule(
                item.menuItemId,
                restaurantId,
            );

            const finalUnitPrice = priceRuleResult.isApplicable
                ? priceRuleResult.specialPrice!
                : Number(item.unitPrice);

            const finalTotalPrice = finalUnitPrice * item.quantity;

            const existing = grouped.get(item.menuItemId);

            if (existing) {
                existing.quantity += item.quantity;
                existing.totalPrice += finalTotalPrice;

                // ✅ PUSH RAW STATUS
                existing.statuses.push(item.status);

                if (priceRuleResult.isApplicable) {
                    existing.specialApplied = true;
                    existing.appliedRuleId = priceRuleResult.appliedRuleId;
                }
            } else {
                grouped.set(item.menuItemId, {
                    name: item.menuItem.name,
                    quantity: item.quantity,
                    unitPrice: finalUnitPrice,
                    totalPrice: finalTotalPrice,
                    appliedRuleId: priceRuleResult.appliedRuleId,
                    specialApplied: priceRuleResult.isApplicable,

                    // ✅ INIT WITH RAW STATUS
                    statuses: [item.status],
                });
            }

            // 🔥 Track bill-level flags
            if (priceRuleResult.isApplicable) {
                isAnySpecialPriceApplied = true;

                if (!appliedPriceRuleId) {
                    appliedPriceRuleId = priceRuleResult.appliedRuleId!;
                }
            }
        }

        const subtotal = Array.from(grouped.values()).reduce(
            (sum, i) => sum + i.totalPrice,
            0,
        );

        // ================================
        // COUPON
        // ================================

        let couponDiscount = 0;
        let appliedCoupon: any = null; // ✅ ADD

        if (dto.couponName) {
            if (!hasCustomerDataInRequest) {
                throw new BadRequestException('Customer details (name, email, or phone) are required to apply a coupon');
            }
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    code: dto.couponName,
                    restaurantId,
                    isActive: true,
                },
            });

            if (!coupon) throw new NotFoundException('Coupon not found');

            const now = new Date();

            if (now < coupon.validFrom || now > coupon.validUntil) {
                throw new BadRequestException('Coupon expired or not yet active');
            }

            if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
                throw new BadRequestException(
                    `Minimum order amount ${coupon.minOrderAmount} required`,
                );
            }

            if (coupon.discountType === 'PERCENTAGE') {
                couponDiscount = subtotal * (Number(coupon.discountValue) / 100);
            } else {
                couponDiscount = Number(coupon.discountValue);
            }

            if (coupon.maxDiscount) {
                couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
            }

            // ✅ STORE FOR RESPONSE
            appliedCoupon = {
                id: coupon.id,
                code: coupon.code,
                name: coupon.name,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue.toString(),
                maxDiscount: coupon.maxDiscount?.toString() ?? null,
                appliedDiscount: couponDiscount.toString(),
            };
        }

        // ================================
        // LOYALTY
        // ================================
        let loyaltyDiscount = 0;
        let appliedLoyalty: any = null; // ✅ ADD
        let customer: any;
        let selectedLoyalityOffer: any = null;
        if (hasCustomerDataInRequest) {
            // here either email, phone or restaurantId can be used. if no email exists use phone, if no phone exist use restaurantId
            const customerLookup: any = { restaurantId };
            const lookupConditions: Array<{ email?: string; phone?: string }> = [];

            if (dto.customerEmail) {
                lookupConditions.push({ email: dto.customerEmail });
            }
            if (dto.customerPhone) {
                lookupConditions.push({ phone: dto.customerPhone });
            }

            if (lookupConditions.length > 0) {
                customerLookup.OR = lookupConditions;
            }

            customer = await this.prisma.customer.findFirst({
                where: customerLookup,
            });
            if (!customer) {
                customer = await this.prisma.customer.create({
                    data: {
                        restaurantId,
                        email: dto.customerEmail ?? null,
                        phone: dto.customerPhone ?? '',
                        name: dto.customerName ?? null,
                    },
                });
            }

            if (dto.customerName && !customer.name) {
                customer = await this.prisma.customer.update({
                    where: { id: customer.id },
                    data: { name: dto.customerName },
                });
            }
            if (dto.customerEmail && !customer.email) {
                customer = await this.prisma.customer.update({
                    where: { id: customer.id },
                    data: { email: dto.customerEmail },
                });
            }
            if (dto.customerPhone && !customer.phone) {
                customer = await this.prisma.customer.update({
                    where: { id: customer.id },
                    data: { phone: dto.customerPhone },
                });
            }
            if (dto.claimedLoyalityPoints) {
                const now = new Date();
                if (dto.loyalityOfferId) {
                    selectedLoyalityOffer = await this.prisma.loyalityOffer.findFirst({
                        where: {
                            id: dto.loyalityOfferId,
                            restaurantId,
                            isActive: true,
                            AND: [
                                { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                                { OR: [{ validTo: null }, { validTo: { gte: now } }] },
                            ],
                        },
                        include: {
                            menuItems: { select: { id: true, name: true } },
                        },
                    });

                    if (!selectedLoyalityOffer) {
                        throw new NotFoundException('Loyalty offer not found');
                    }
                }

                let conversionRate = 0;
                let converter: any = null;

                // grossAmount is calculated after this block in previewBill,
                // so we use subtotal + estimated tax as a safe cap here
                const taxRateTemp = Number(
                    (await this.prisma.restaurant.findUnique({
                        where: { id: restaurantId },
                        select: { taxRate: true },
                    }))?.taxRate ?? 0,
                );
                const grossAmountTemp = parseFloat(
                    (subtotal + (subtotal * taxRateTemp) / 100).toFixed(2),
                );
                const manualDiscountTemp = Number(dto.discountAmount ?? 0);

                const remainingAfterOtherDiscounts = Math.max(
                    0,
                    grossAmountTemp - manualDiscountTemp - couponDiscount,
                );

                const redemptions = await this.prisma.loyalityPointRedemption.findMany({
                    where: {
                        customerId: customer.id,
                        loyalityPoint: {
                            restaurantId,
                            isActive: true,
                            OR: [
                                { endDate: null },
                                { endDate: { gte: now } },
                            ],
                            AND: [
                                {
                                    OR: [
                                        { conditionMinAmount: null },
                                        { conditionMinAmount: { lte: remainingAfterOtherDiscounts } },
                                    ],
                                },
                                {
                                    OR: [
                                        { conditionMaxAmount: null },
                                        { conditionMaxAmount: { gte: remainingAfterOtherDiscounts } },
                                    ],
                                },
                            ],
                        } as any,
                    },
                    include: {
                        loyalityPoint: {
                            select: { id: true, name: true },
                        },
                    },
                });

                const totalPoints = redemptions.reduce(
                    (sum, r) => sum + Number(r.pointsAwarded),
                    0,
                );

                let pointsConsumed = 0;

                if (selectedLoyalityOffer) {
                    const offerPointsRequired = Number(selectedLoyalityOffer.pointsRequired);
                    if (totalPoints < offerPointsRequired) {
                        throw new BadRequestException(
                            'Not enough loyalty points for the selected offer',
                        );
                    }

                    if (selectedLoyalityOffer.type === 'AMOUNT') {
                        const offerAmount = Number(selectedLoyalityOffer.redeemAmount ?? 0);
                        if (offerAmount <= 0) {
                            throw new BadRequestException(
                                'Selected amount offer is not configured correctly',
                            );
                        }

                        loyaltyDiscount = parseFloat(
                            Math.min(offerAmount, remainingAfterOtherDiscounts).toFixed(2),
                        );
                        pointsConsumed = offerPointsRequired;
                    } else {
                        const eligibleBillItem = items.find((item) =>
                            selectedLoyalityOffer.menuItems.some(
                                (menuItem: { id: string }) =>
                                    menuItem.id === item.menuItemId,
                            ),
                        );

                        if (!eligibleBillItem) {
                            throw new BadRequestException(
                                'Selected food offer does not match any item in this bill',
                            );
                        }

                        loyaltyDiscount = parseFloat(
                            Math.min(Number(eligibleBillItem.unitPrice), remainingAfterOtherDiscounts).toFixed(2),
                        );
                        pointsConsumed = offerPointsRequired;
                    }
                } else {
                    converter = await this.prisma.loyalityPointsConverter.findFirst({
                        where: {
                            restaurantId,
                            isActive: true,
                        },
                    });

                    if (!converter) {
                        throw new BadRequestException('Loyalty converter not configured');
                    }

                    // Convert points → money
                    conversionRate = Number(converter.value) / Number(converter.points);

                    const maxPossibleDiscount = parseFloat(
                        (totalPoints * conversionRate).toFixed(2),
                    );

                    loyaltyDiscount = parseFloat(
                        Math.min(maxPossibleDiscount, remainingAfterOtherDiscounts).toFixed(2),
                    );

                    pointsConsumed = Math.ceil(loyaltyDiscount / conversionRate);
                }

                const pointsRemaining = totalPoints - pointsConsumed;

                // ✅ STORE FOR RESPONSE
                appliedLoyalty = {
                    customerId: customer.id,
                    customerName: customer.name,
                    totalPoints,
                    pointsConsumed,
                    pointsRemaining,
                    convertedAmount: loyaltyDiscount.toString(),
                    conversionRate: conversionRate.toString(),
                    selectedLoyalityOffer: selectedLoyalityOffer
                        ? {
                            id: selectedLoyalityOffer.id,
                            name: selectedLoyalityOffer.name,
                            type: selectedLoyalityOffer.type,
                            pointsRequired: selectedLoyalityOffer.pointsRequired.toString(),
                            redeemAmount: selectedLoyalityOffer.redeemAmount?.toString() ?? null,
                        }
                        : null,
                    redemptions: redemptions.map((r) => ({
                        id: r.id,
                        points: r.pointsAwarded.toString(),
                        loyalityPoint: {
                            id: r.loyalityPoint.id,
                            name: r.loyalityPoint.name,
                        },
                    })),
                };
            }
        }

        // ================================
        // FINAL CALCULATION
        // ================================
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { taxRate: true },
        });

        const manualDiscount = Number(dto.discountAmount ?? 0);
        const taxRate = Number(restaurant?.taxRate ?? 0);
        // Step 1: tax on subtotal
        const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));

        // Step 2: gross
        const grossAmount = subtotal + taxAmount;

        // Step 3: total discount (clamped)
        const totalDiscount = Math.min(
            grossAmount,
            manualDiscount + couponDiscount + loyaltyDiscount,
        );

        // Step 4: final total
        const totalAmount = parseFloat(
            (grossAmount - totalDiscount).toFixed(2),
        );

        // ================================
        // LOYALTY EARNINGS PREVIEW
        // ================================
        let loyaltyEarningsPreview: any = null;
        try {
            if (customer) {
                const award = await this.computeLoyaltyAwards(
                    this.prisma,
                    restaurantId,
                    totalAmount,
                    items.map((it) => ({ menuItemId: it.menuItemId })),
                    customer.id,
                );
                loyaltyEarningsPreview = award;
            }
        } catch (err) {
            // Do not fail preview on loyalty calculation errors
            this.logger.debug('Loyalty earnings preview failed: ' + (err as any).message);
        }

        // ================================
        // RESPONSE SHAPING
        // ================================


        return {
            sessionId,
            restaurantId,
            status: 'DRAFT',

            subtotal: subtotal.toString(),
            taxRate: taxRate.toString(),
            taxAmount: taxAmount.toString(),
            grossAmount: grossAmount.toString(),
            discountAmount: totalDiscount.toString(),
            coupounDiscountAmount: couponDiscount.toString(),
            loyalityPointDiscountAmount: loyaltyDiscount.toString(),
            totalAmount: totalAmount.toString(),

            notes: dto.notes ?? null,

            items: items.map((item) => {
                const priceRuleResult = {
                    isApplicable: false,
                    appliedRuleId: null,
                };

                // ⚠️ IMPORTANT:
                // If you want exact same pricing logic,
                // you should reuse earlier computed values.
                // But for now keeping minimal change:

                return {
                    id: item.id, // ✅ unique order item
                    batchId: item.batchId,
                    menuItemId: item.menuItemId,
                    name: item.menuItem.name,

                    quantity: item.quantity,
                    unitPrice: item.unitPrice.toString(),
                    totalPrice: item.totalPrice.toString(),

                    status: item.status, // ✅ EXACT STATUS

                    specialPriceApplied: false, // keep as before or recompute
                    appliedRuleId: null,

                    menuItem: {
                        id: item.menuItemId,
                        name: item.menuItem.name,
                        imageUrl: item.menuItem.imageUrl,
                    },
                };
            }),

            session: {
                id: session.id,
                sessionNumber: session.sessionNumber,
                channel: session.channel,
                customerName: hasCustomerDataInRequest
                    ? dto.customerName || session.customerName || null
                    : null,
                customerPhone: hasCustomerDataInRequest
                    ? dto.customerPhone || session.customerPhone || null
                    : null,
                customerEmail: hasCustomerDataInRequest
                    ? dto.customerEmail || session.customerEmail || null
                    : null,
                table: session.table,
            },

            // ✅ ADD THESE TWO
            coupon: appliedCoupon,
            loyalty: appliedLoyalty ? { ...appliedLoyalty, willEarn: loyaltyEarningsPreview } : (loyaltyEarningsPreview ? { willEarn: loyaltyEarningsPreview } : null),
        };
    }

    // =========================================================================
    // PAYMENT
    // =========================================================================

    async addPayment(actor: User, billId: string, dto: AddPaymentDto) {
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
        if (!bill) throw new NotFoundException(`Bill ${billId} not found`);
        if (bill.status === 'VOIDED') {
            throw new BadRequestException('Cannot add payment to a voided bill');
        }
        if (bill.status === 'PAID') {
            throw new BadRequestException('Bill is already fully paid');
        }

        const restaurantId = bill.session.restaurantId;
        await this.assertRestaurantAccess(actor, restaurantId);

        const allowedRoles = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.BILLER,
        ] as UserRole[];
        if (!(allowedRoles as UserRole[]).includes(actor.role)) {
            throw new ForbiddenException('Only BILLER and above can record payments');
        }

        // Check amount doesn't exceed balance
        const totalPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remaining = Number(bill.totalAmount) - totalPaid;
        const paymentAmount = Number(dto.amount);

        if (paymentAmount <= 0) {
            throw new BadRequestException('Payment amount must be positive');
        }
        if (paymentAmount > remaining + 0.01) {
            throw new BadRequestException(
                `Payment of ${paymentAmount} exceeds remaining balance of ${remaining.toFixed(2)}`,
            );
        }

        const isFullyPaid = paymentAmount >= remaining - 0.01;

        const payment = await this.prisma.$transaction(async (tx) => {
            const created = await tx.payment.create({
                data: {
                    billId,
                    amount: paymentAmount,
                    method: dto.method as any,
                    reference: dto.reference ?? null,
                    notes: dto.notes ?? null,
                    processedById: actor.id,
                },
            });

            if (isFullyPaid) {
                await tx.bill.update({
                    where: { id: billId },
                    data: { status: 'PAID' as any, paidAt: new Date() },
                });
                await tx.orderSession.update({
                    where: { id: bill.session.id },
                    data: { status: 'PAID' as any, closedAt: new Date() },
                });

                if (bill.customerId) {
                    await this.awardLoyaltyPointsForPaidBill(
                        tx,
                        restaurantId,
                        billId,
                        bill.customerId,
                        Number(bill.totalAmount),
                    );
                }
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
            // Release table if no more open sessions
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

            this.logger.log(
                `Bill ${bill.billNumber} fully paid on session ${bill.session.sessionNumber}`,
            );
        }

        return { payment, isFullyPaid };
    }

    private async awardLoyaltyPointsForPaidBill(
        tx: Prisma.TransactionClient,
        restaurantId: string,
        billId: string,
        customerId: string,
        billAmount: number,
    ): Promise<void> {
        if (billAmount <= 0) return;

        const now = new Date();
        const currentDay = now
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toUpperCase() as any;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Fetch bill items (menu items + category) then compute awards using helper
        const billItems = await tx.billItem.findMany({
            where: { billId },
            select: {
                menuItemId: true,
                menuItem: {
                    select: {
                        categoryId: true,
                    },
                },
            },
        });

        const computed = await this.computeLoyaltyAwards(tx, restaurantId, billAmount, billItems, customerId);

        if (computed.breakdown.length > 0) {
            const rows = computed.breakdown.map((b) => ({
                loyalityPointId: b.loyalityPointId,
                customerId,
                pointsAwarded: new Prisma.Decimal(b.pointsAwarded.toFixed(2)),
            }));

            await tx.loyalityPointRedemption.createMany({ data: rows });

            const totalPointsAwarded = computed.totalPoints;
            await tx.customer.update({
                where: { id: customerId },
                data: {
                    loyaltyWallet: {
                        increment: new Prisma.Decimal(totalPointsAwarded),
                    },
                },
            });
        }
    }

    private async computeLoyaltyAwards(
        client: any,
        restaurantId: string,
        billAmount: number,
        billItems: Array<{ menuItemId: string; menuItem?: { categoryId?: string | null } }>,
        customerId?: string,
    ): Promise<{
        totalPoints: number;
        breakdown: Array<{ loyalityPointId: string; name?: string | null; pointsAwarded: number }>;
    }> {
        const now = new Date();

        const billAmountDecimal = new Prisma.Decimal(billAmount);

        // Ensure we have category ids for items
        const menuItemIds = Array.from(new Set(billItems.map((i) => i.menuItemId)));
        const needFetch = billItems.some((i) => !i.menuItem || i.menuItem.categoryId === undefined);
        if (needFetch && menuItemIds.length) {
            const fetched = await client.menuItem.findMany({
                where: { id: { in: menuItemIds } },
                select: { id: true, categoryId: true },
            });
            const map = new Map(fetched.map((m: any) => [m.id, m.categoryId]));
            billItems.forEach((it) => {
                if (!it.menuItem) {
                    const v = map.get(it.menuItemId) as string | null | undefined;
                    it.menuItem = { categoryId: v ?? null } as any;
                } else if (it.menuItem.categoryId === undefined) {
                    const v = map.get(it.menuItemId) as string | null | undefined;
                    it.menuItem.categoryId = v ?? null;
                }
            });
        }

        const billMenuItemIds = new Set(billItems.map((item) => item.menuItemId));
        const billCategoryIds = new Set(billItems.map((item) => item.menuItem?.categoryId).filter(Boolean));

        const rules = await client.loyalityPoint.findMany({
            where: {
                restaurantId,
                isActive: true,
                AND: [
                    { OR: [{ startDate: null }, { startDate: { lte: now } }] },
                    { OR: [{ endDate: null }, { endDate: { gte: now } }] },
                    {
                        OR: [
                            { conditionMinAmount: null },
                            { conditionMinAmount: { lte: billAmountDecimal } },
                        ],
                    },
                    {
                        OR: [
                            { conditionMaxAmount: null },
                            { conditionMaxAmount: { gte: billAmountDecimal } },
                        ],
                    },
                ],
            },
            include: { days: { select: { day: true } }, menuItems: true, categories: true },
        });

        const breakdown: Array<{ loyalityPointId: string; name?: string | null; pointsAwarded: number }> = [];

        const currentDay = now
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toUpperCase() as any;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        for (const rule of rules as any[]) {
            if (rule.days.length > 0) {
                const activeDays = new Set(rule.days.map((d) => d.day));
                if (!activeDays.has(currentDay)) continue;
            }

            if (!this.isWithinLoyaltyTimeWindow(currentMinutes, rule.startTime, rule.endTime)) continue;

            if (rule.menuItems && rule.menuItems.length > 0) {
                const ruleMenuItemIds = new Set(rule.menuItems.map((mi: any) => mi.id));
                const hasMatchingItem = Array.from(billMenuItemIds).some((id) => ruleMenuItemIds.has(id));
                if (!hasMatchingItem) continue;
            }

            if (rule.categories.length > 0) {
                const hasMatchingCategory = rule.categories.some((c: any) => billCategoryIds.has(c.id));
                if (!hasMatchingCategory) continue;
            }

            if (rule.maxUsagePerCustomer !== null && customerId) {
                const usageCount = await client.loyalityPointRedemption.count({
                    where: { loyalityPointId: rule.id, customerId },
                });
                if (usageCount >= rule.maxUsagePerCustomer) continue;
            }

            // Compute points using ratio if present
            const ratio = rule.loyalityDiscountRatio ? Number(rule.loyalityDiscountRatio) : null;
            const ruleMaxPoints = rule.points !== null && rule.points !== undefined ? Number(rule.points) : null;

            let awarded = 0;

            if (ratio !== null && !Number.isNaN(ratio)) {
                awarded = Number(billAmount) * ratio;
                if (ruleMaxPoints !== null) {
                    awarded = Math.min(awarded, ruleMaxPoints);
                }
            } else if (ruleMaxPoints !== null) {
                awarded = ruleMaxPoints;
            }

            awarded = parseFloat(awarded.toFixed(2));
            if (awarded <= 0) continue;

            breakdown.push({ loyalityPointId: rule.id, name: rule.name ?? null, pointsAwarded: awarded });
        }

        const totalPoints = breakdown.reduce((s, b) => s + b.pointsAwarded, 0);
        return { totalPoints, breakdown };
    }

    private isWithinLoyaltyTimeWindow(
        currentMinutes: number,
        startTime?: string | null,
        endTime?: string | null,
    ): boolean {
        const start = this.parseTimeToMinutes(startTime);
        const end = this.parseTimeToMinutes(endTime);

        if (start === null && end === null) return true;
        if (start !== null && end === null) return currentMinutes >= start;
        if (start === null && end !== null) return currentMinutes <= end;

        if (start! <= end!) {
            return currentMinutes >= start! && currentMinutes <= end!;
        }

        return currentMinutes >= start! || currentMinutes <= end!;
    }

    private parseTimeToMinutes(time?: string | null): number | null {
        if (!time) return null;

        const [hh, mm] = time.split(':').map((v) => Number(v));
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

        return hh * 60 + mm;
    }

    async getPaymentsForBill(actor: User, billId: string) {
        const bill = await this.prisma.bill.findUnique({
            where: { id: billId },
            select: { session: { select: { restaurantId: true } } },
        });
        if (!bill) throw new NotFoundException(`Bill ${billId} not found`);

        await this.assertRestaurantAccess(actor, bill.session.restaurantId);

        return this.prisma.payment.findMany({
            where: { billId },
            orderBy: { createdAt: 'asc' },
            include: { processedBy: { select: { id: true, name: true } } },
        });
    }

    async getOrderAnalytics(
        actor: User,
        restaurantId: string,
        filters: {
            sessionStatus?: SessionStatus;
            billStatus?: BillStatus;
            startDate?: string;
            endDate?: string;
        },
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const { sessionStatus, billStatus, startDate, endDate } = filters;

        const dateFilter =
            startDate && endDate
                ? {
                    createdAt: {
                        gte: new Date(startDate),
                        lt: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
                    },
                }
                : {};

        const sessionWhere: any = {
            restaurantId,
            ...dateFilter,
        };

        if (sessionStatus) {
            sessionWhere.status = sessionStatus;
        }

        const billWhere: any = {
            restaurantId,
        };

        if (billStatus) {
            billWhere.status = billStatus;
        }

        if (startDate && endDate) {
            billWhere.createdAt = {
                gte: new Date(startDate),
                lt: new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000),
            };
        }

        // TOTAL ORDERS
        const totalOrders = await this.prisma.orderSession.count({
            where: sessionWhere,
        });

        // TOTAL REVENUE
        const revenueAgg = await this.prisma.bill.aggregate({
            where: billWhere,
            _sum: {
                totalAmount: true,
            },
        });

        const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);

        const averageRevenue =
            totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // CHANNEL ORDER COUNTS
        const ordersByChannel = await this.prisma.orderSession.groupBy({
            by: ['channel'],
            where: sessionWhere,
            _count: {
                channel: true,
            },
        });

        // CHANNEL REVENUE
        const revenueByChannel = await this.prisma.bill.groupBy({
            by: ['restaurantId'],
            where: billWhere,
            _sum: {
                totalAmount: true,
            },
        });

        // Map revenue by session channel
        const sessions = await this.prisma.orderSession.findMany({
            where: sessionWhere,
            select: {
                id: true,
                channel: true,
                bill: {
                    select: {
                        totalAmount: true,
                        status: true,
                    },
                },
            },
        });

        const insights: Record<string, { order: number; revenue: number }> = {};

        for (const s of sessions) {
            const channel = s.channel;

            if (!insights[channel]) {
                insights[channel] = { order: 0, revenue: 0 };
            }

            insights[channel].order += 1;

            if (s.bill && (!billStatus || s.bill.status === billStatus)) {
                insights[channel].revenue += Number(s.bill.totalAmount ?? 0);
            }
        }

        return {
            totalOrder: totalOrders,
            totalRevenue,
            averageRevenue,
            insights,
        };
    }

    Guest
    async getOrdersWithAnalytics(
        actor: User,
        restaurantId: string,
        filters: {
            channel?: OrderChannel;
            status?: SessionStatus;
            startDate?: string;
            endDate?: string;
            search?: string;   // 👈 NEW
        },
        page: number,
        limit: number,
        fetchAll = false,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const { channel, status, startDate, endDate, search } = filters;

        const where: any = {
            restaurantId,
        };

        if (channel) where.channel = channel;
        if (status) where.status = status;

        if (startDate && endDate) {
            where.createdAt = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }
        // 🔥 SEARCH LOGIC
        if (search) {
            where.customerName = {
                contains: search
            };
        }
        type OrderSessionWithRelations = Prisma.OrderSessionGetPayload<{
            include: {
                table: true;
                bill: true;
                openedBy: true,
                orderSessionUpdateTimes: true
            };
        }>;


        const paginated = await paginate({
            prismaModel: this.prisma.orderSession,
            page,
            limit,
            fetchAll,
            where,
            include: {
                table: true,
                bill: true,
                openedBy: true,
                orderSessionUpdateTimes: true
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const sessions = paginated.data as OrderSessionWithRelations[];

        // ANALYTICS
        const totalOrders = await this.prisma.orderSession.count({ where });

        const revenueAgg = await this.prisma.bill.aggregate({
            where: {
                restaurantId,
                ...(startDate && endDate
                    ? {
                        createdAt: {
                            gte: new Date(startDate),
                            lte: new Date(endDate),
                        },
                    }
                    : {}),
            },
            _sum: {
                totalAmount: true,
            },
        });

        const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);

        const completedSessions = sessions.filter((s) => s.closedAt);

        const avgSpendTime =
            completedSessions.reduce((acc, s) => {
                const minutes =
                    (new Date(s.closedAt!).getTime() - new Date(s.createdAt).getTime()) /
                    60000;
                return acc + minutes;
            }, 0) / (completedSessions.length || 1);

        // Fetch table names for all sessions with a tableId
        const tableIds = Array.from(
            new Set(
                sessions
                    .map((s) => s.tableId)
                    .filter((id): id is string => typeof id === 'string' && id !== null)
            )
        );
        const tables = tableIds.length
            ? await this.prisma.table.findMany({
                where: { id: { in: tableIds } },
                select: { id: true, name: true },
            })
            : [];
        const tableMap = Object.fromEntries(tables.map((t) => [t.id, t.name]));

        const orders = sessions.map((s) => ({
            order_id: s.id,
            timestamp: s.createdAt.toISOString(),

            customer: {
                name: s.customerName,
                email: s.customerEmail
            },

            channel: s.channel,

            table_number: s.tableId ? tableMap[s.tableId] ?? null : null,

            total_amount: Number(s.bill?.totalAmount ?? 0),

            status: this.mapSessionStatusToOrderStatus(s.status as SessionStatus),
            opened_by: s.openedBy ? { id: s.openedBy.id, name: s.openedBy.name } : null,
            orderSessionUpdateTimes: s.orderSessionUpdateTimes.map((u) => ({
                updatedAt: u.updatedAt,
                fieldChanged: u.fieldChanged,
                oldValue: u.oldValue,
                newValue: u.newValue,
            }))
        }));

        return {
            analytics: {
                total_revenue: {
                    value: totalRevenue,
                    change_percentage: 0,
                },

                total_orders: {
                    value: totalOrders,
                    change_percentage: 0,
                },

                avg_spend_time: {
                    value: Math.round(avgSpendTime),
                },
            },

            orders,

            meta: paginated.meta,
        };
    }

    async getOrderDetails(
        actor: User,
        restaurantId: string,
        sessionId: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);
        console.log('Fetching details for session', sessionId);
        const session = await this.prisma.orderSession.findFirst({
            where: {
                id: sessionId,
                restaurantId,
            },
            include: {
                table: true,
                batches: {
                    include: {
                        items: {
                            include: {
                                menuItem: true,
                            },
                        },
                    },
                },
                bill: true,
                openedBy: true,
                orderSessionUpdateTimes: true,
            },
        });

        if (!session) {
            throw new NotFoundException('Order not found');
        }

        const items = session.batches.flatMap(batch =>
            batch.items.map(item => ({
                name: item.menuItem.name,
                description: item.notes ?? null,
                image_url: item.menuItem.imageUrl ?? null,
                quantity: item.quantity,
                unit_price: Number(item.unitPrice),
            })),
        );

        const startTime = session.createdAt;
        const estimatedCheckout = session.closedAt ?? null;

        // Prefer explicit update times when available — fall back to session fields
        const updateTimes = session.orderSessionUpdateTimes ?? [];
        const findUpdateTime = (target: string) => {
            if (!updateTimes || updateTimes.length === 0) return null;
            const up = updateTimes.find((u) => {
                if (!u) return false;
                const newV = (u.newValue ?? '').toString().toUpperCase();
                const oldV = (u.oldValue ?? '').toString().toUpperCase();
                return newV === target || oldV === target || newV.includes(target) || oldV.includes(target);
            });
            return up ? up.updatedAt : null;
        };

        const timeline = [
            {
                status: 'Received',
                timestamp: session.createdAt,
                is_completed: true,
            },
            {
                status: 'Served',
                // prefer explicit 'SERVED' update time, else use first batch createdAt if present
                timestamp: findUpdateTime('SERVED') ?? (session.batches.length ? session.batches[0].createdAt : null),
                is_completed: session.batches.length > 0 || Boolean(findUpdateTime('SERVED')),
            },
            {
                status: 'Billed',
                // prefer explicit 'BILLED' update time, else fallback to session.closedAt
                timestamp: findUpdateTime('BILLED') ?? session.closedAt ?? null,
                is_completed: session.status === 'BILLED' || session.status === 'PAID' || Boolean(findUpdateTime('BILLED')),
            },
            {
                status: 'Paid',
                // prefer explicit 'PAID' update time, else fallback to bill.paidAt
                timestamp: findUpdateTime('PAID') ?? session.bill?.paidAt ?? null,
                is_completed: session.status === 'PAID' || Boolean(findUpdateTime('PAID')),
            },
        ];

        return {
            order_header: {
                order_id: session.id,
                status_tag: session.status,
                channel_name: session.channel,
                total_amount: Number(session.bill?.totalAmount ?? 0),
            },

            customer_details: {
                customer_name: session.customerName ?? 'Guest',
                email: session.customerEmail ?? null,
                table_number: session.table?.name ?? null,
                start_time: startTime,
                estimated_checkout: estimatedCheckout,
            },

            order_items: items,

            order_status_timeline: timeline,

            financial_summary: {
                subtotal: Number(session.bill?.subtotal ?? 0),
                tax_percentage: Number(session.bill?.taxRate ?? 0),
                tax_amount: Number(session.bill?.taxAmount ?? 0),
                delivery_fee: Number(session.deliveryFee ?? 0),
                grand_total: Number(session.bill?.totalAmount ?? 0),
            },
            opened_by: session.openedBy ? { id: session.openedBy.id, name: session.openedBy.name } : null,
            orderSessionUpdateTimes: session.orderSessionUpdateTimes.map((u) => ({
                updatedAt: u.updatedAt,
                fieldChanged: u.fieldChanged,
                oldValue: u.oldValue,
                newValue: u.newValue,
            }))
        };
    }


    async getOrderTimeline(
        actor: User,
        restaurantId: string,
        period: 'day' | 'week' | 'month' | 'year',
        value?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const now = new Date();

        let startDate: Date;
        let endDate: Date;
        let groupBy: string;
        let labels: string[] = [];

        // ---------------- DAY ----------------
        if (period === 'day') {
            const target = value ? new Date(value) : new Date();

            if (isNaN(target.getTime())) {
                throw new BadRequestException('Invalid date format (YYYY-MM-DD)');
            }

            startDate = new Date(target);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(target);
            endDate.setHours(23, 59, 59, 999);

            groupBy = 'HOUR(createdAt)';
            labels = Array.from({ length: 24 }, (_, i) =>
                i.toString().padStart(2, '0') + ':00',
            );
        }

        // ---------------- WEEK ----------------
        else if (period === 'week') {
            const today = new Date();

            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);

            startDate = new Date(today.setDate(diff));
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);

            groupBy = 'DAYOFWEEK(createdAt)';
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        }

        // ---------------- MONTH ----------------
        else if (period === 'month') {
            const month = value ? Number(value) - 1 : now.getMonth();

            if (month < 0 || month > 11) {
                throw new BadRequestException('Month must be between 1-12');
            }

            const year = now.getFullYear();

            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0, 23, 59, 59);

            groupBy = 'DAY(createdAt)';
            const days = endDate.getDate();
            labels = Array.from({ length: days }, (_, i) => (i + 1).toString());
        }

        // ---------------- YEAR ----------------
        else if (period === 'year') {
            const year = value ? Number(value) : now.getFullYear();

            if (isNaN(year)) {
                throw new BadRequestException('Invalid year');
            }

            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59);

            groupBy = 'MONTH(createdAt)';
            labels = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
        }

        else {
            throw new BadRequestException('Invalid period');
        }

        // ---------------- QUERY ----------------
        const result: any[] = await this.prisma.$queryRawUnsafe(`
    SELECT 
        label,
        channel,
        COUNT(*) as orders
    FROM (
        SELECT 
            ${groupBy} AS label,
            channel
        FROM order_sessions
        WHERE restaurantId = '${restaurantId}'
          AND createdAt BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
    ) t
    GROUP BY label, channel
    ORDER BY label
`);

        const channels = ['DINE_IN', 'ONLINE_OWN', 'UBER_EATS', 'DOORDASH'];

        const datasets = channels.map((channel) => ({
            label: channel,
            data: Array(labels.length).fill(0),
        }));

        // ---------------- MAP ----------------
        for (const row of result) {
            const label = Number(row.label);
            const orders = Number(row.orders);

            let index = 0;

            switch (period) {
                case 'day':
                    index = label;
                    break;
                case 'week':
                    index = (label + 5) % 7;
                    break;
                case 'month':
                    index = label - 1;
                    break;
                case 'year':
                    index = label - 1;
                    break;
            }

            const dataset = datasets.find(d => d.label === row.channel);

            if (dataset && index >= 0 && index < dataset.data.length) {
                dataset.data[index] = orders;
            }
        }

        return {
            period,
            labels,
            datasets,
        };
    }


    async getRevenueTimeline(
        actor: User,
        restaurantId: string,
        period: 'day' | 'week' | 'month' | 'year',
        value?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const now = new Date();

        let startDate: Date;
        let endDate: Date;
        let groupBy: string;
        let labels: string[] = [];

        // ---------------- DAY ----------------
        if (period === 'day') {
            const target = value ? new Date(value) : new Date();

            if (isNaN(target.getTime())) {
                throw new BadRequestException('Invalid date format (YYYY-MM-DD)');
            }

            startDate = new Date(target);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(target);
            endDate.setHours(23, 59, 59, 999);

            groupBy = 'HOUR(createdAt)';
            labels = Array.from({ length: 24 }, (_, i) =>
                i.toString().padStart(2, '0') + ':00',
            );
        }

        // ---------------- WEEK ----------------
        else if (period === 'week') {
            const today = new Date();

            const day = today.getDay();
            const diff = today.getDate() - day + (day === 0 ? -6 : 1);

            startDate = new Date(today.setDate(diff));
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);

            groupBy = 'DAYOFWEEK(createdAt)';
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        }

        // ---------------- MONTH ----------------
        else if (period === 'month') {
            const month = value ? Number(value) - 1 : now.getMonth();

            if (month < 0 || month > 11) {
                throw new BadRequestException('Month must be between 1-12');
            }

            const year = now.getFullYear();

            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0, 23, 59, 59);

            groupBy = 'DAY(createdAt)';
            const days = endDate.getDate();
            labels = Array.from({ length: days }, (_, i) => (i + 1).toString());
        }

        // ---------------- YEAR ----------------
        else if (period === 'year') {
            const year = value ? Number(value) : now.getFullYear();

            if (isNaN(year)) {
                throw new BadRequestException('Invalid year');
            }

            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31, 23, 59, 59);

            groupBy = 'MONTH(createdAt)';
            labels = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
            ];
        }

        else {
            throw new BadRequestException('Invalid period');
        }

        // ---------------- QUERY ----------------
        const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT 
            label,
            channel,
            SUM(totalAmount) as revenue
        FROM (
            SELECT 
                ${groupBy} AS label,
                channel,
                totalAmount
            FROM order_sessions
            WHERE restaurantId = '${restaurantId}'
              AND totalAmount IS NOT NULL
              AND createdAt BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
        ) t
        GROUP BY label, channel
        ORDER BY label
    `);

        const channels = ['DINE_IN', 'ONLINE_OWN', 'UBER_EATS', 'DOORDASH'];

        const datasets = channels.map((channel) => ({
            label: channel,
            data: Array(labels.length).fill(0),
        }));

        // ---------------- MAP ----------------
        for (const row of result) {
            const label = Number(row.label);
            const revenue = Number(row.revenue);

            let index = 0;

            switch (period) {
                case 'day':
                    index = label;
                    break;
                case 'week':
                    index = (label + 5) % 7;
                    break;
                case 'month':
                    index = label - 1;
                    break;
                case 'year':
                    index = label - 1;
                    break;
            }

            const dataset = datasets.find(d => d.label === row.channel);

            if (dataset && index >= 0 && index < dataset.data.length) {
                dataset.data[index] = Number(revenue.toFixed(2)); // currency safe
            }
        }

        return {
            period,
            labels,
            datasets,
        };
    }
}
