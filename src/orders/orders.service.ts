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
import { User, UserRole } from '@prisma/client';
import { CreateSessionDto, OrderChannel } from './dto/create-session.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateItemStatusDto, OrderItemStatus } from './dto/update-item-status.dto';
import { UpdateBatchStatusDto, BatchStatus } from './dto/update-batch-status.dto';
import { UpdateSessionStatusDto, SessionStatus } from './dto/update-session-status.dto';
import { GenerateBillDto } from './dto/generate-bill.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { generateShortId } from './utils/id-generator';
import { OrdersGateway } from './orders.gateway';

// ─── Include clauses ──────────────────────────────────────────────────────────

const SESSION_SUMMARY_INCLUDE = {
    table: { select: { id: true, name: true, seatCount: true, status: true } },
    openedBy: { select: { id: true, name: true, role: true } },
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
} as const;

const BATCH_INCLUDE = {
    items: { include: { menuItem: { select: { id: true, name: true } } } },
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
            select: { price: true },
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

        // Only WAITER, RESTAURANT_ADMIN, OWNER, SUPER_ADMIN can open sessions
        const allowedCreators: UserRole[] = [
            UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.WAITER,
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

        const session = await this.prisma.orderSession.create({
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

        // Mark table as OCCUPIED if applicable
        if (dto.tableId) {
            await this.prisma.table.update({
                where: { id: dto.tableId },
                data: { status: 'OCCUPIED' as any },
            });

            this.gateway.emitTableStatus(dto.tableId, restaurantId, 'OCCUPIED');
        }

        this.gateway.emitToRestaurant(restaurantId, 'session:opened', session);
        this.logger.log(
            `Session ${sessionNumber} opened by ${actor.name} (${actor.role}) in restaurant ${restaurantId}`,
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

        const session = await this.prisma.orderSession.findFirst({
            where: { id: sessionId, restaurantId },
        });
        if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

        const updated = await this.prisma.orderSession.update({
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

        // Release table if session is being closed
        if (
            session.tableId &&
            [SessionStatus.PAID, SessionStatus.CANCELLED, SessionStatus.VOID].includes(dto.status)
        ) {
            await this.releaseTableIfNoOpenSessions(session.tableId, sessionId);
        }

        this.gateway.emitToRestaurant(restaurantId, 'session:status:changed', {
            sessionId,
            status: dto.status,
        });

        return updated;
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
                throw new BadRequestException(`Menu item "${menuItem.name}" is not available`);
            }
            if (menuItem.isOutOfStock) {
                throw new BadRequestException(`Menu item "${menuItem.name}" is out of stock`);
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

        // Emit to kitchen (for chefs) and restaurant-wide (for waiters)
        this.gateway.emitToKitchen(restaurantId, 'batch:created', batch);
        this.gateway.emitToRestaurant(restaurantId, 'batch:created', batch);
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
                actor.role !== UserRole.RESTAURANT_ADMIN
            ) {
                throw new ForbiddenException('Only CHEF can mark items as PREPARING or PREPARED');
            }
        }

        if (dto.status === OrderItemStatus.SERVED) {
            if (
                actor.role !== UserRole.WAITER &&
                actor.role !== UserRole.SUPER_ADMIN &&
                actor.role !== UserRole.OWNER &&
                actor.role !== UserRole.RESTAURANT_ADMIN
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
                menuItem: { select: { id: true, name: true } },
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
        if (session.status !== 'OPEN') {
            throw new BadRequestException(`Session is already "${session.status}" — cannot regenerate bill`);
        }
        if (session.bill) {
            throw new ConflictException(
                `Bill ${session.bill.billNumber} already exists for this session. Use PATCH to update discount.`,
            );
        }

        // Collect all non-cancelled items from all batches
        const items = await this.prisma.orderItem.findMany({
            where: {
                batch: { sessionId },
                status: { not: 'CANCELLED' as any },
            },
            include: { menuItem: { select: { id: true, name: true } } },
        });

        if (items.length === 0) {
            throw new BadRequestException('Cannot generate bill for a session with no items');
        }

        // Aggregate by menuItem
        const grouped = new Map<string, { name: string; quantity: number; unitPrice: number; totalPrice: number }>();
        for (const item of items) {
            const existing = grouped.get(item.menuItemId);
            if (existing) {
                existing.quantity += item.quantity;
                existing.totalPrice += Number(item.totalPrice);
            } else {
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

            // Update session pricing snapshot and status
            await tx.orderSession.update({
                where: { id: sessionId },
                data: {
                    status: 'BILLED' as any,
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

    async getBillForSession(
        actor: User,
        restaurantId: string,
        sessionId: string,
    ) {
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
            throw new NotFoundException(`No bill found for session ${sessionId}`);
        }

        return bill;
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
}
