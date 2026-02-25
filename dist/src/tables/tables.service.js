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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TablesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const client_1 = require("@prisma/client");
const GROUP_INCLUDE = {
    _count: { select: { tables: true } },
};
const GROUP_LIST_INCLUDE = {
    _count: { select: { tables: true } },
    tables: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, seatCount: true, isActive: true },
    },
};
const TABLE_INCLUDE = {
    group: { select: { id: true, name: true, color: true } },
};
let TablesService = class TablesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assertRestaurantAccess(actor, restaurantId, mode) {
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
        if (mode === 'manage' &&
            (actor.role === client_1.UserRole.WAITER || actor.role === client_1.UserRole.CHEF || actor.role === client_1.UserRole.BILLER)) {
            throw new common_1.ForbiddenException('WAITER, CHEF and BILLER can only view tables, not create or edit them');
        }
    }
    async createGroup(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const existing = await this.prisma.tableGroup.findUnique({
            where: { restaurantId_name: { restaurantId, name: dto.name } },
        });
        if (existing) {
            throw new common_1.ConflictException(`Table group "${dto.name}" already exists in this restaurant`);
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
    async findAllGroups(actor, restaurantId, page = 1, limit = 10) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.tableGroup,
            page,
            limit,
            where: { restaurantId },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: GROUP_LIST_INCLUDE,
        });
    }
    async findOneGroup(actor, restaurantId, id) {
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
            throw new common_1.NotFoundException(`Table group ${id} not found in restaurant ${restaurantId}`);
        }
        return group;
    }
    async updateGroup(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const group = await this.prisma.tableGroup.findFirst({
            where: { id, restaurantId },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Table group ${id} not found in restaurant ${restaurantId}`);
        }
        if (dto.name && dto.name !== group.name) {
            const conflict = await this.prisma.tableGroup.findUnique({
                where: { restaurantId_name: { restaurantId, name: dto.name } },
            });
            if (conflict) {
                throw new common_1.ConflictException(`Table group "${dto.name}" already exists in this restaurant`);
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
    async removeGroup(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const group = await this.prisma.tableGroup.findFirst({
            where: { id, restaurantId },
            include: { _count: { select: { tables: true } } },
        });
        if (!group) {
            throw new common_1.NotFoundException(`Table group ${id} not found in restaurant ${restaurantId}`);
        }
        if (group._count.tables > 0) {
            throw new common_1.ConflictException(`Cannot delete group "${group.name}" — it has ${group._count.tables} table(s). ` +
                `Move or delete the tables first.`);
        }
        await this.prisma.tableGroup.delete({ where: { id } });
        return { message: `Table group "${group.name}" deleted successfully` };
    }
    async createTable(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        if (dto.groupId) {
            const group = await this.prisma.tableGroup.findFirst({
                where: { id: dto.groupId, restaurantId },
            });
            if (!group) {
                throw new common_1.NotFoundException(`Table group ${dto.groupId} not found in restaurant ${restaurantId}`);
            }
        }
        const existing = await this.prisma.table.findUnique({
            where: { restaurantId_name: { restaurantId, name: dto.name } },
        });
        if (existing) {
            throw new common_1.ConflictException(`Table "${dto.name}" already exists in this restaurant`);
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
    async findAllTables(actor, restaurantId, groupId, page = 1, limit = 10) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        if (groupId) {
            const group = await this.prisma.tableGroup.findFirst({
                where: { id: groupId, restaurantId },
            });
            if (!group) {
                throw new common_1.NotFoundException(`Table group ${groupId} not found in restaurant ${restaurantId}`);
            }
        }
        return (0, pagination_util_1.paginate)({
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
    async findUngroupedTables(actor, restaurantId, page = 1, limit = 10) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.table,
            page,
            limit,
            where: { restaurantId, groupId: null },
            orderBy: { name: 'asc' },
            include: TABLE_INCLUDE,
        });
    }
    async findOneTable(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const table = await this.prisma.table.findFirst({
            where: { id, restaurantId },
            include: TABLE_INCLUDE,
        });
        if (!table) {
            throw new common_1.NotFoundException(`Table ${id} not found in restaurant ${restaurantId}`);
        }
        return table;
    }
    async updateTable(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const table = await this.prisma.table.findFirst({
            where: { id, restaurantId },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Table ${id} not found in restaurant ${restaurantId}`);
        }
        if (dto.groupId !== undefined) {
            if (dto.groupId !== null) {
                const group = await this.prisma.tableGroup.findFirst({
                    where: { id: dto.groupId, restaurantId },
                });
                if (!group) {
                    throw new common_1.NotFoundException(`Table group ${dto.groupId} not found in restaurant ${restaurantId}`);
                }
            }
        }
        if (dto.name && dto.name !== table.name) {
            const conflict = await this.prisma.table.findUnique({
                where: { restaurantId_name: { restaurantId, name: dto.name } },
            });
            if (conflict) {
                throw new common_1.ConflictException(`Table "${dto.name}" already exists in this restaurant`);
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
    async removeTable(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const table = await this.prisma.table.findFirst({
            where: { id, restaurantId },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Table ${id} not found in restaurant ${restaurantId}`);
        }
        await this.prisma.table.delete({ where: { id } });
        return { message: `Table "${table.name}" deleted successfully` };
    }
    async assignTableToGroup(actor, restaurantId, tableId, groupId) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const table = await this.prisma.table.findFirst({
            where: { id: tableId, restaurantId },
        });
        if (!table) {
            throw new common_1.NotFoundException(`Table ${tableId} not found in restaurant ${restaurantId}`);
        }
        if (groupId !== null) {
            const group = await this.prisma.tableGroup.findFirst({
                where: { id: groupId, restaurantId },
            });
            if (!group) {
                throw new common_1.NotFoundException(`Table group ${groupId} not found in restaurant ${restaurantId}`);
            }
        }
        return this.prisma.table.update({
            where: { id: tableId },
            data: { groupId },
            include: TABLE_INCLUDE,
        });
    }
};
exports.TablesService = TablesService;
exports.TablesService = TablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TablesService);
//# sourceMappingURL=tables.service.js.map