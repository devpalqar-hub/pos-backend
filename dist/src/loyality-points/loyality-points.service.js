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
exports.LoyalityPointsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const client_1 = require("@prisma/client");
let LoyalityPointsService = class LoyalityPointsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.defaultInclude = {
            restaurant: { select: { id: true, name: true } },
            days: { select: { id: true, day: true } },
            categories: { select: { id: true, name: true } },
            menuItems: { select: { id: true, name: true, price: true } },
        };
    }
    async create(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        return this.prisma.loyalityPoint.create({
            data: {
                restaurantId,
                name: dto.name,
                points: dto.points ?? 0,
                isGroup: dto.isGroup ?? false,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                startTime: dto.startTime ?? null,
                endTime: dto.endTime ?? null,
                maxUsagePerCustomer: dto.maxUsagePerCustomer ?? null,
                ...(dto.weekDays?.length && {
                    days: {
                        create: dto.weekDays.map((day) => ({ day })),
                    },
                }),
                ...(dto.categoryIds?.length && {
                    categories: {
                        connect: dto.categoryIds.map((id) => ({ id })),
                    },
                }),
                ...(dto.menuItemIds?.length && {
                    menuItems: {
                        connect: dto.menuItemIds.map((id) => ({ id })),
                    },
                }),
            },
            include: this.defaultInclude,
        });
    }
    resolveType(type) {
        switch (type) {
            case 'menu':
                return {
                    menuItems: {
                        some: {},
                    },
                };
            case 'category':
                return {
                    categories: {
                        some: {},
                    },
                };
            case 'time':
                return {
                    OR: [
                        { startTime: { not: null } },
                        { endTime: { not: null } },
                    ],
                };
            case 'date':
                return {
                    AND: [
                        { startDate: { not: null } },
                        { endDate: { not: null } },
                    ],
                };
            case 'day':
                return {
                    days: {
                        some: {},
                    },
                };
            default:
                return {};
        }
    }
    async findAll(actor, restaurantId, page = 1, limit = 10, search, status, type) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.loyalityPoint,
            page,
            limit,
            where: {
                restaurantId,
                ...(search && {
                    name: {
                        contains: search,
                    },
                }),
                ...(status !== undefined && {
                    isActive: status === 'true',
                }),
                ...this.resolveType(type),
            },
            orderBy: [{ createdAt: 'desc' }],
            include: this.defaultInclude,
        });
    }
    async findOne(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const record = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
            include: this.defaultInclude,
        });
        if (!record) {
            throw new common_1.NotFoundException(`Loyalty point rule ${id} not found in restaurant ${restaurantId}`);
        }
        return record;
    }
    async update(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const existing = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Loyalty point rule ${id} not found in restaurant ${restaurantId}`);
        }
        return this.prisma.$transaction(async (tx) => {
            if (dto.weekDays !== undefined) {
                await tx.loyalityPointDay.deleteMany({
                    where: { loyalityPointId: id },
                });
                if (dto.weekDays.length) {
                    await tx.loyalityPointDay.createMany({
                        data: dto.weekDays.map((day) => ({
                            loyalityPointId: id,
                            day,
                        })),
                    });
                }
            }
            return tx.loyalityPoint.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.points !== undefined && { points: dto.points }),
                    ...(dto.isGroup !== undefined && { isGroup: dto.isGroup }),
                    ...(dto.startDate !== undefined && {
                        startDate: dto.startDate ? new Date(dto.startDate) : null,
                    }),
                    ...(dto.endDate !== undefined && {
                        endDate: dto.endDate ? new Date(dto.endDate) : null,
                    }),
                    ...(dto.startTime !== undefined && { startTime: dto.startTime }),
                    ...(dto.endTime !== undefined && { endTime: dto.endTime }),
                    ...(dto.maxUsagePerCustomer !== undefined && {
                        maxUsagePerCustomer: dto.maxUsagePerCustomer,
                    }),
                    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                    ...(dto.categoryIds !== undefined && {
                        categories: {
                            set: dto.categoryIds.map((cid) => ({ id: cid })),
                        },
                    }),
                    ...(dto.menuItemIds !== undefined && {
                        menuItems: {
                            set: dto.menuItemIds.map((mid) => ({ id: mid })),
                        },
                    }),
                },
                include: this.defaultInclude,
            });
        });
    }
    async remove(actor, restaurantId, id) {
        this.assertAdminOrAbove(actor);
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const record = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
        });
        if (!record) {
            throw new common_1.NotFoundException(`Loyalty point rule ${id} not found in restaurant ${restaurantId}`);
        }
        await this.prisma.loyalityPoint.delete({ where: { id } });
        return {
            message: `Loyalty point rule "${record.name}" deleted successfully`,
        };
    }
    async assertRestaurantAccess(actor, restaurantId, mode) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
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
            (actor.role === client_1.UserRole.WAITER ||
                actor.role === client_1.UserRole.CHEF ||
                actor.role === client_1.UserRole.BILLER)) {
            throw new common_1.ForbiddenException('WAITER, CHEF and BILLER can only view loyalty points, not manage them');
        }
    }
    assertAdminOrAbove(actor) {
        const allowed = [
            client_1.UserRole.SUPER_ADMIN,
            client_1.UserRole.OWNER,
            client_1.UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new common_1.ForbiddenException('Insufficient permissions to delete loyalty point rules');
        }
    }
};
exports.LoyalityPointsService = LoyalityPointsService;
exports.LoyalityPointsService = LoyalityPointsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LoyalityPointsService);
//# sourceMappingURL=loyality-points.service.js.map