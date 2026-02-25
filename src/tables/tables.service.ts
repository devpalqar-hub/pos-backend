import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { CreateTableGroupDto } from './dto/create-table-group.dto';
import { UpdateTableGroupDto } from './dto/update-table-group.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { User, UserRole } from '@prisma/client';

// ─── Include clauses ──────────────────────────────────────────────────────────

const GROUP_INCLUDE = {
    _count: { select: { tables: true } },
} as const;

const GROUP_LIST_INCLUDE = {
    _count: { select: { tables: true } },
    tables: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, seatCount: true, isActive: true },
    },
} as const;

const TABLE_INCLUDE = {
    group: { select: { id: true, name: true, color: true } },
} as const;

@Injectable()
export class TablesService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Permission helpers ───────────────────────────────────────────────────

    private async assertRestaurantAccess(
        actor: User,
        restaurantId: string,
        mode: 'view' | 'manage',
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

        // RESTAURANT_ADMIN, WAITER, CHEF — must be assigned to this restaurant
        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException('You are not assigned to this restaurant');
        }

        if (
            mode === 'manage' &&
            (actor.role === UserRole.WAITER || actor.role === UserRole.CHEF || actor.role === UserRole.BILLER)
        ) {
            throw new ForbiddenException(
                'WAITER, CHEF and BILLER can only view tables, not create or edit them',
            );
        }
    }

    // =========================================================================
    // TABLE GROUPS
    // =========================================================================

    // ─── Create group ─────────────────────────────────────────────────────────

    async createGroup(actor: User, restaurantId: string, dto: CreateTableGroupDto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const existing = await this.prisma.tableGroup.findUnique({
            where: { restaurantId_name: { restaurantId, name: dto.name } },
        });
        if (existing) {
            throw new ConflictException(
                `Table group "${dto.name}" already exists in this restaurant`,
            );
        }

        return this.prisma.tableGroup.create({
            data: {
                restaurantId,
                name: dto.name,
                description: dto.description ?? null,
                color: dto.color ?? null,
                sortOrder: dto.sortOrder ?? 0,
                isActive: dto.isActive ?? true,
                createdById: actor.id,
            },
            include: GROUP_INCLUDE,
        });
    }

    // ─── List groups ──────────────────────────────────────────────────────────

    async findAllGroups(actor: User, restaurantId: string, page: number = 1, limit: number = 10) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        return paginate({
            prismaModel: this.prisma.tableGroup,
            page,
            limit,
            where: { restaurantId },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: GROUP_LIST_INCLUDE,
        });
    }

    // ─── Get one group ────────────────────────────────────────────────────────

    async findOneGroup(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const group = await this.prisma.tableGroup.findFirst({
            where: { id, restaurantId },
            include: {
                _count: { select: { tables: true } },
                tables: {
                    orderBy: { name: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        seatCount: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!group) {
            throw new NotFoundException(
                `Table group ${id} not found in restaurant ${restaurantId}`,
            );
        }

        return group;
    }

    // ─── Update group ─────────────────────────────────────────────────────────

    async updateGroup(
        actor: User,
        restaurantId: string,
        id: string,
        dto: UpdateTableGroupDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const group = await this.prisma.tableGroup.findFirst({
            where: { id, restaurantId },
        });
        if (!group) {
            throw new NotFoundException(
                `Table group ${id} not found in restaurant ${restaurantId}`,
            );
        }

        // Name uniqueness check (only when changing name)
        if (dto.name && dto.name !== group.name) {
            const conflict = await this.prisma.tableGroup.findUnique({
                where: { restaurantId_name: { restaurantId, name: dto.name } },
            });
            if (conflict) {
                throw new ConflictException(
                    `Table group "${dto.name}" already exists in this restaurant`,
                );
            }
        }

        return this.prisma.tableGroup.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.color !== undefined && { color: dto.color }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: GROUP_INCLUDE,
        });
    }

    // ─── Delete group ─────────────────────────────────────────────────────────

    async removeGroup(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const group = await this.prisma.tableGroup.findFirst({
            where: { id, restaurantId },
            include: { _count: { select: { tables: true } } },
        });
        if (!group) {
            throw new NotFoundException(
                `Table group ${id} not found in restaurant ${restaurantId}`,
            );
        }

        if (group._count.tables > 0) {
            throw new ConflictException(
                `Cannot delete group "${group.name}" — it has ${group._count.tables} table(s). ` +
                `Move or delete the tables first.`,
            );
        }

        await this.prisma.tableGroup.delete({ where: { id } });
        return { message: `Table group "${group.name}" deleted successfully` };
    }

    // =========================================================================
    // TABLES
    // =========================================================================

    // ─── Create table ─────────────────────────────────────────────────────────

    async createTable(actor: User, restaurantId: string, dto: CreateTableDto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        // If a groupId is provided, verify it belongs to the same restaurant
        if (dto.groupId) {
            const group = await this.prisma.tableGroup.findFirst({
                where: { id: dto.groupId, restaurantId },
            });
            if (!group) {
                throw new NotFoundException(
                    `Table group ${dto.groupId} not found in restaurant ${restaurantId}`,
                );
            }
        }

        // Name must be unique within the restaurant
        const existing = await this.prisma.table.findUnique({
            where: { restaurantId_name: { restaurantId, name: dto.name } },
        });
        if (existing) {
            throw new ConflictException(
                `Table "${dto.name}" already exists in this restaurant`,
            );
        }

        return this.prisma.table.create({
            data: {
                restaurantId,
                groupId: dto.groupId ?? null,
                name: dto.name,
                seatCount: dto.seatCount,
                isActive: dto.isActive ?? true,
                createdById: actor.id,
            },
            include: TABLE_INCLUDE,
        });
    }

    // ─── List tables ──────────────────────────────────────────────────────────

    async findAllTables(
        actor: User,
        restaurantId: string,
        groupId?: string,
        page: number = 1,
        limit: number = 10,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        // If groupId filter is provided, verify the group exists in this restaurant
        if (groupId) {
            const group = await this.prisma.tableGroup.findFirst({
                where: { id: groupId, restaurantId },
            });
            if (!group) {
                throw new NotFoundException(
                    `Table group ${groupId} not found in restaurant ${restaurantId}`,
                );
            }
        }

        return paginate({
            prismaModel: this.prisma.table,
            page,
            limit,
            where: {
                restaurantId,
                ...(groupId !== undefined ? { groupId } : {}),
            },
            orderBy: [{ name: 'asc' }],
            include: TABLE_INCLUDE,
        });
    }

    // ─── List ungrouped tables ───────────────────────────────────────────────

    async findUngroupedTables(actor: User, restaurantId: string, page: number = 1, limit: number = 10) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        return paginate({
            prismaModel: this.prisma.table,
            page,
            limit,
            where: { restaurantId, groupId: null },
            orderBy: { name: 'asc' },
            include: TABLE_INCLUDE,
        });
    }

    // ─── Get one table ────────────────────────────────────────────────────────

    async findOneTable(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const table = await this.prisma.table.findFirst({
            where: { id, restaurantId },
            include: TABLE_INCLUDE,
        });

        if (!table) {
            throw new NotFoundException(
                `Table ${id} not found in restaurant ${restaurantId}`,
            );
        }

        return table;
    }

    // ─── Update table ─────────────────────────────────────────────────────────

    async updateTable(
        actor: User,
        restaurantId: string,
        id: string,
        dto: UpdateTableDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const table = await this.prisma.table.findFirst({
            where: { id, restaurantId },
        });
        if (!table) {
            throw new NotFoundException(
                `Table ${id} not found in restaurant ${restaurantId}`,
            );
        }

        // Validate groupId if being changed
        if (dto.groupId !== undefined) {
            if (dto.groupId !== null) {
                const group = await this.prisma.tableGroup.findFirst({
                    where: { id: dto.groupId, restaurantId },
                });
                if (!group) {
                    throw new NotFoundException(
                        `Table group ${dto.groupId} not found in restaurant ${restaurantId}`,
                    );
                }
            }
        }

        // Name uniqueness check (only when changing name)
        if (dto.name && dto.name !== table.name) {
            const conflict = await this.prisma.table.findUnique({
                where: { restaurantId_name: { restaurantId, name: dto.name } },
            });
            if (conflict) {
                throw new ConflictException(
                    `Table "${dto.name}" already exists in this restaurant`,
                );
            }
        }

        return this.prisma.table.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.seatCount !== undefined && { seatCount: dto.seatCount }),
                ...(dto.groupId !== undefined && { groupId: dto.groupId }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: TABLE_INCLUDE,
        });
    }

    // ─── Delete table ─────────────────────────────────────────────────────────

    async removeTable(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const table = await this.prisma.table.findFirst({
            where: { id, restaurantId },
        });
        if (!table) {
            throw new NotFoundException(
                `Table ${id} not found in restaurant ${restaurantId}`,
            );
        }

        await this.prisma.table.delete({ where: { id } });
        return { message: `Table "${table.name}" deleted successfully` };
    }

    // ─── Assign table to group ────────────────────────────────────────────────

    async assignTableToGroup(
        actor: User,
        restaurantId: string,
        tableId: string,
        groupId: string | null,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const table = await this.prisma.table.findFirst({
            where: { id: tableId, restaurantId },
        });
        if (!table) {
            throw new NotFoundException(
                `Table ${tableId} not found in restaurant ${restaurantId}`,
            );
        }

        if (groupId !== null) {
            const group = await this.prisma.tableGroup.findFirst({
                where: { id: groupId, restaurantId },
            });
            if (!group) {
                throw new NotFoundException(
                    `Table group ${groupId} not found in restaurant ${restaurantId}`,
                );
            }
        }

        return this.prisma.table.update({
            where: { id: tableId },
            data: { groupId },
            include: TABLE_INCLUDE,
        });
    }
}
