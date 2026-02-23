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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const ADMIN_ROLES = [client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN];
const STAFF_ROLES = [client_1.UserRole.WAITER, client_1.UserRole.CHEF];
const CREATABLE_BY = {
    [client_1.UserRole.SUPER_ADMIN]: [
        client_1.UserRole.SUPER_ADMIN,
        client_1.UserRole.OWNER,
        client_1.UserRole.RESTAURANT_ADMIN,
        client_1.UserRole.WAITER,
        client_1.UserRole.CHEF,
    ],
    [client_1.UserRole.OWNER]: [
        client_1.UserRole.RESTAURANT_ADMIN,
        client_1.UserRole.WAITER,
        client_1.UserRole.CHEF,
    ],
    [client_1.UserRole.RESTAURANT_ADMIN]: [client_1.UserRole.WAITER, client_1.UserRole.CHEF],
    [client_1.UserRole.WAITER]: [],
    [client_1.UserRole.CHEF]: [],
};
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(actor, dto) {
        this.assertCanCreate(actor, dto.role);
        if (actor.role === client_1.UserRole.OWNER) {
            if (!dto.restaurantId) {
                throw new common_1.BadRequestException('restaurantId is required when creating users as an Owner');
            }
            await this.assertOwnsRestaurant(actor.id, dto.restaurantId);
        }
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN) {
            if (!actor.restaurantId) {
                throw new common_1.ForbiddenException('You are not assigned to any restaurant');
            }
            if (dto.restaurantId && dto.restaurantId !== actor.restaurantId) {
                throw new common_1.ForbiddenException('You can only create users in your assigned restaurant');
            }
            dto.restaurantId = actor.restaurantId;
        }
        if ([...STAFF_ROLES, client_1.UserRole.RESTAURANT_ADMIN].includes(dto.role) && !dto.restaurantId) {
            throw new common_1.BadRequestException(`restaurantId is required for role ${dto.role}`);
        }
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new common_1.ConflictException(`A user with email ${dto.email} already exists`);
        }
        const created = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                role: dto.role,
                restaurantId: dto.restaurantId ?? null,
                createdById: actor.id,
            },
            include: {
                restaurant: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });
        return this.filterResponse(actor.role, created);
    }
    async findAll(actor) {
        let users;
        switch (actor.role) {
            case client_1.UserRole.SUPER_ADMIN:
                users = await this.prisma.user.findMany({
                    include: {
                        restaurant: { select: { id: true, name: true } },
                        createdBy: { select: { id: true, name: true } },
                        ownedRestaurants: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                break;
            case client_1.UserRole.OWNER: {
                const owned = await this.prisma.restaurant.findMany({
                    where: { ownerId: actor.id },
                    select: { id: true },
                });
                const restaurantIds = owned.map((r) => r.id);
                users = await this.prisma.user.findMany({
                    where: {
                        OR: [
                            { restaurantId: { in: restaurantIds } },
                            { id: actor.id },
                        ],
                    },
                    include: {
                        restaurant: { select: { id: true, name: true } },
                        createdBy: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                break;
            }
            case client_1.UserRole.RESTAURANT_ADMIN:
                if (!actor.restaurantId)
                    return [];
                users = await this.prisma.user.findMany({
                    where: { restaurantId: actor.restaurantId },
                    include: { restaurant: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                });
                break;
            default:
                users = await this.prisma.user.findMany({
                    where: { id: actor.id },
                });
                break;
        }
        return users.map((u) => this.filterResponse(actor.role, u));
    }
    async findOne(actor, targetId) {
        const target = await this.prisma.user.findUnique({
            where: { id: targetId },
            include: {
                restaurant: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                ownedRestaurants: { select: { id: true, name: true } },
            },
        });
        if (!target)
            throw new common_1.NotFoundException(`User ${targetId} not found`);
        this.assertCanViewUser(actor, target);
        return this.filterResponse(actor.role, target);
    }
    async update(actor, targetId, dto) {
        const target = await this.prisma.user.findUnique({
            where: { id: targetId },
        });
        if (!target)
            throw new common_1.NotFoundException(`User ${targetId} not found`);
        this.assertCanEditUser(actor, target);
        if (dto.role !== undefined && actor.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only Super Admin can change user roles');
        }
        if (dto.isActive !== undefined &&
            ![client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER].includes(actor.role)) {
            throw new common_1.ForbiddenException('Only Super Admin or Owner can activate/deactivate users');
        }
        const updated = await this.prisma.user.update({
            where: { id: targetId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.email && { email: dto.email }),
                ...(dto.role && { role: dto.role }),
                ...(dto.restaurantId !== undefined && {
                    restaurantId: dto.restaurantId,
                }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: {
                restaurant: { select: { id: true, name: true } },
            },
        });
        return this.filterResponse(actor.role, updated);
    }
    async getProfile(actor) {
        const user = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: {
                restaurant: { select: { id: true, name: true } },
                ownedRestaurants: actor.role === client_1.UserRole.OWNER
                    ? { select: { id: true, name: true, isActive: true } }
                    : false,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Profile not found');
        return this.filterResponse(actor.role, user);
    }
    async updateProfile(actor, dto) {
        const updated = await this.prisma.user.update({
            where: { id: actor.id },
            data: { ...(dto.name && { name: dto.name }) },
            include: { restaurant: { select: { id: true, name: true } } },
        });
        return this.filterResponse(actor.role, updated);
    }
    async remove(actor, targetId) {
        const target = await this.prisma.user.findUnique({
            where: { id: targetId },
        });
        if (!target)
            throw new common_1.NotFoundException(`User ${targetId} not found`);
        if (actor.role === client_1.UserRole.OWNER) {
            await this.assertOwnerCanManage(actor, target);
        }
        else if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('You are not allowed to delete users');
        }
        if (target.id === actor.id) {
            throw new common_1.ForbiddenException('You cannot delete your own account');
        }
        await this.prisma.user.delete({ where: { id: targetId } });
        return { message: `User ${target.email} has been deleted` };
    }
    assertCanCreate(actor, targetRole) {
        const allowed = CREATABLE_BY[actor.role] ?? [];
        if (!allowed.includes(targetRole)) {
            throw new common_1.ForbiddenException(`As a ${actor.role}, you cannot create users with role ${targetRole}`);
        }
    }
    assertCanViewUser(actor, target) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        if (actor.id === target.id)
            return;
        if (actor.role === client_1.UserRole.OWNER) {
            return;
        }
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN) {
            if (target.restaurantId !== actor.restaurantId) {
                throw new common_1.ForbiddenException('You can only view users in your restaurant');
            }
            return;
        }
        if (actor.id !== target.id) {
            throw new common_1.ForbiddenException('You can only view your own profile');
        }
    }
    assertCanEditUser(actor, target) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        if (actor.id === target.id)
            return;
        if (actor.role === client_1.UserRole.OWNER) {
            return;
        }
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN) {
            if (target.restaurantId !== actor.restaurantId) {
                throw new common_1.ForbiddenException('You can only edit users in your assigned restaurant');
            }
            return;
        }
        throw new common_1.ForbiddenException('You can only edit your own profile');
    }
    async assertOwnsRestaurant(ownerId, restaurantId) {
        const restaurant = await this.prisma.restaurant.findFirst({
            where: { id: restaurantId, ownerId },
        });
        if (!restaurant) {
            throw new common_1.ForbiddenException(`Restaurant ${restaurantId} does not belong to you`);
        }
    }
    async assertOwnerCanManage(actor, target) {
        const owned = await this.prisma.restaurant.findMany({
            where: { ownerId: actor.id },
            select: { id: true },
        });
        const ids = owned.map((r) => r.id);
        if (!ids.includes(target.restaurantId)) {
            throw new common_1.ForbiddenException('You can only manage users in your own restaurants');
        }
    }
    filterResponse(actorRole, user) {
        const base = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            restaurantId: user.restaurantId ?? null,
            restaurant: user.restaurant ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        switch (actorRole) {
            case client_1.UserRole.SUPER_ADMIN:
                return {
                    ...base,
                    createdById: user.createdById ?? null,
                    createdBy: user.createdBy ?? null,
                    ownedRestaurants: user.ownedRestaurants ?? undefined,
                };
            case client_1.UserRole.OWNER:
                return {
                    ...base,
                    createdBy: user.createdBy
                        ? { id: user.createdBy.id, name: user.createdBy.name }
                        : null,
                };
            case client_1.UserRole.RESTAURANT_ADMIN:
                return {
                    id: base.id,
                    name: base.name,
                    email: base.email,
                    role: base.role,
                    isActive: base.isActive,
                    restaurant: base.restaurant,
                    createdAt: base.createdAt,
                };
            default:
                return {
                    id: base.id,
                    name: base.name,
                    email: base.email,
                    role: base.role,
                    isActive: base.isActive,
                    restaurant: base.restaurant,
                };
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map