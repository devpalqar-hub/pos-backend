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
var RestaurantsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const client_1 = require("@prisma/client");
const RESTAURANT_INCLUDE = {
    owner: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    workingHours: {
        orderBy: { day: 'asc' },
        select: {
            id: true,
            day: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
        },
    },
    staff: {
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    },
};
const RESTAURANT_LIST_INCLUDE = {
    owner: { select: { id: true, name: true, email: true } },
    workingHours: {
        select: { day: true, openTime: true, closeTime: true, isClosed: true },
    },
    _count: { select: { staff: true } },
};
let RestaurantsService = RestaurantsService_1 = class RestaurantsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(RestaurantsService_1.name);
        this.VALID_ROLES = [client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER, client_1.UserRole.CHEF, client_1.UserRole.BILLER];
    }
    async create(actor, dto) {
        const owner = await this.prisma.user.findUnique({
            where: { id: dto.ownerId },
        });
        if (!owner) {
            throw new common_1.NotFoundException(`Owner with id ${dto.ownerId} not found`);
        }
        if (owner.role !== client_1.UserRole.OWNER) {
            throw new common_1.BadRequestException(`User ${dto.ownerId} does not have the OWNER role. Only OWNER users can own restaurants.`);
        }
        if (!owner.isActive) {
            throw new common_1.BadRequestException(`Owner account is deactivated`);
        }
        const slug = dto.slug ?? this.buildSlug(dto.name);
        await this.assertSlugAvailable(slug);
        const { workingHours, ...restDto } = dto;
        const restaurant = await this.prisma.restaurant.create({
            data: {
                name: restDto.name,
                slug,
                description: restDto.description ?? null,
                ownerId: restDto.ownerId,
                createdById: actor.id,
                phone: restDto.phone ?? null,
                email: restDto.email ?? null,
                website: restDto.website ?? null,
                address: restDto.address ?? null,
                city: restDto.city ?? null,
                state: restDto.state ?? null,
                country: restDto.country ?? null,
                postalCode: restDto.postalCode ?? null,
                latitude: restDto.latitude ?? null,
                longitude: restDto.longitude ?? null,
                logoUrl: restDto.logoUrl ?? null,
                coverUrl: restDto.coverUrl ?? null,
                cuisineType: restDto.cuisineType ?? null,
                maxCapacity: restDto.maxCapacity ?? null,
                taxRate: restDto.taxRate ?? null,
                currency: restDto.currency ?? 'USD',
                workingHours: workingHours?.length
                    ? {
                        create: workingHours.map((wh) => ({
                            day: wh.day,
                            openTime: wh.openTime ?? null,
                            closeTime: wh.closeTime ?? null,
                            isClosed: wh.isClosed ?? false,
                        })),
                    }
                    : undefined,
            },
            include: RESTAURANT_INCLUDE,
        });
        return restaurant;
    }
    async findAll(actor, page = 1, limit = 10) {
        switch (actor.role) {
            case client_1.UserRole.SUPER_ADMIN:
                return (0, pagination_util_1.paginate)({
                    prismaModel: this.prisma.restaurant,
                    page,
                    limit,
                    include: RESTAURANT_LIST_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                });
            case client_1.UserRole.OWNER:
                return (0, pagination_util_1.paginate)({
                    prismaModel: this.prisma.restaurant,
                    page,
                    limit,
                    where: { ownerId: actor.id },
                    include: RESTAURANT_LIST_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                });
            case client_1.UserRole.RESTAURANT_ADMIN:
            case client_1.UserRole.WAITER:
            case client_1.UserRole.CHEF:
            case client_1.UserRole.BILLER:
                if (!actor.restaurantId)
                    return { data: [], meta: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false } };
                return (0, pagination_util_1.paginate)({
                    prismaModel: this.prisma.restaurant,
                    page,
                    limit,
                    where: { id: actor.restaurantId },
                    include: RESTAURANT_LIST_INCLUDE,
                });
            default:
                return { data: [], meta: { total: 0, page, limit, totalPages: 0, hasNextPage: false, hasPrevPage: false } };
        }
    }
    async findOne(actor, id) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
            include: RESTAURANT_INCLUDE,
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${id} not found`);
        this.assertCanViewRestaurant(actor, restaurant);
        return this.filterResponse(actor.role, restaurant);
    }
    async update(actor, id, dto) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${id} not found`);
        this.assertCanEditRestaurant(actor, restaurant);
        if (dto.ownerId !== undefined && actor.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only Super Admin can transfer restaurant ownership');
        }
        if (dto.ownerId) {
            const newOwner = await this.prisma.user.findUnique({
                where: { id: dto.ownerId },
            });
            if (!newOwner)
                throw new common_1.NotFoundException(`User ${dto.ownerId} not found`);
            if (newOwner.role !== client_1.UserRole.OWNER) {
                throw new common_1.BadRequestException('The target user must have the OWNER role');
            }
        }
        if (dto.isActive !== undefined &&
            ![client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER].includes(actor.role)) {
            throw new common_1.ForbiddenException('Only Super Admin or Owner can activate/deactivate a restaurant');
        }
        if (dto.slug && dto.slug !== restaurant.slug) {
            await this.assertSlugAvailable(dto.slug);
        }
        const { workingHours, ...restDto } = dto;
        const updated = await this.prisma.restaurant.update({
            where: { id },
            data: {
                ...(restDto.name !== undefined && { name: restDto.name }),
                ...(restDto.slug !== undefined && { slug: restDto.slug }),
                ...(restDto.description !== undefined && { description: restDto.description }),
                ...(restDto.ownerId !== undefined && { ownerId: restDto.ownerId }),
                ...(restDto.phone !== undefined && { phone: restDto.phone }),
                ...(restDto.email !== undefined && { email: restDto.email }),
                ...(restDto.website !== undefined && { website: restDto.website }),
                ...(restDto.address !== undefined && { address: restDto.address }),
                ...(restDto.city !== undefined && { city: restDto.city }),
                ...(restDto.state !== undefined && { state: restDto.state }),
                ...(restDto.country !== undefined && { country: restDto.country }),
                ...(restDto.postalCode !== undefined && { postalCode: restDto.postalCode }),
                ...(restDto.latitude !== undefined && { latitude: restDto.latitude }),
                ...(restDto.longitude !== undefined && { longitude: restDto.longitude }),
                ...(restDto.logoUrl !== undefined && { logoUrl: restDto.logoUrl }),
                ...(restDto.coverUrl !== undefined && { coverUrl: restDto.coverUrl }),
                ...(restDto.cuisineType !== undefined && { cuisineType: restDto.cuisineType }),
                ...(restDto.maxCapacity !== undefined && { maxCapacity: restDto.maxCapacity }),
                ...(restDto.taxRate !== undefined && { taxRate: restDto.taxRate }),
                ...(restDto.currency !== undefined && { currency: restDto.currency }),
                ...(restDto.isActive !== undefined && { isActive: restDto.isActive }),
            },
            include: RESTAURANT_INCLUDE,
        });
        if (workingHours?.length) {
            await this.upsertWorkingHours(id, workingHours);
            return this.prisma.restaurant.findUnique({
                where: { id },
                include: RESTAURANT_INCLUDE,
            });
        }
        return this.filterResponse(actor.role, updated);
    }
    async remove(actor, id) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${id} not found`);
        if (actor.role !== client_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Only Super Admin can delete restaurants');
        }
        await this.prisma.user.updateMany({
            where: { restaurantId: id },
            data: { restaurantId: null },
        });
        await this.prisma.restaurant.delete({ where: { id } });
        this.logger.log(`Restaurant ${restaurant.name} (${id}) deleted by ${actor.email}`);
        return { message: `Restaurant "${restaurant.name}" has been deleted` };
    }
    async assignStaff(actor, restaurantId, dto) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        this.assertCanManageStaff(actor, restaurant);
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user)
            throw new common_1.NotFoundException(`User ${dto.userId} not found`);
        if (user.role === client_1.UserRole.SUPER_ADMIN || user.role === client_1.UserRole.OWNER) {
            throw new common_1.BadRequestException(`Cannot assign SUPER_ADMIN or OWNER users to a restaurant as staff`);
        }
        if (actor.role === client_1.UserRole.OWNER && restaurant.ownerId !== actor.id) {
            throw new common_1.ForbiddenException('You can only assign staff to your own restaurants');
        }
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN &&
            actor.restaurantId !== restaurantId) {
            throw new common_1.ForbiddenException('You can only assign staff to your assigned restaurant');
        }
        const updated = await this.prisma.user.update({
            where: { id: dto.userId },
            data: { restaurantId },
            select: { id: true, name: true, email: true, role: true, restaurantId: true },
        });
        return {
            message: `${user.name} has been assigned to ${restaurant.name}`,
            user: updated,
        };
    }
    async removeStaff(actor, restaurantId, dto) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        this.assertCanManageStaff(actor, restaurant);
        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user)
            throw new common_1.NotFoundException(`User ${dto.userId} not found`);
        if (user.restaurantId !== restaurantId) {
            throw new common_1.BadRequestException(`User ${user.name} is not assigned to this restaurant`);
        }
        await this.prisma.user.update({
            where: { id: dto.userId },
            data: { restaurantId: null },
        });
        return {
            message: `${user.name} has been removed from ${restaurant.name}`,
        };
    }
    async getStaff(actor, restaurantId, filters, page = 1, limit = 10) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        this.assertCanViewRestaurant(actor, restaurant);
        const where = { restaurantId };
        if (filters?.name) {
            where.name = {
                contains: filters.name,
            };
        }
        if (filters?.roles && filters.roles.length > 0) {
            const invalidRoles = filters.roles.filter(role => !this.VALID_ROLES.includes(role));
            if (invalidRoles.length > 0) {
                throw new common_1.BadRequestException(`Invalid role(s): ${invalidRoles.join(', ')}. Valid roles are: ${this.VALID_ROLES.join(', ')}`);
            }
            where.role = {
                in: filters.roles,
            };
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.user,
            page,
            limit,
            where,
            orderBy: { createdAt: 'asc' },
        });
    }
    async getWorkingHours(actor, restaurantId) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        this.assertCanViewRestaurant(actor, restaurant);
        return this.prisma.workingHours.findMany({
            where: { restaurantId },
            orderBy: { day: 'asc' },
            select: { id: true, day: true, openTime: true, closeTime: true, isClosed: true },
        });
    }
    assertCanViewRestaurant(actor, restaurant) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        if (actor.role === client_1.UserRole.OWNER && restaurant.ownerId === actor.id)
            return;
        if ([client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER, client_1.UserRole.CHEF, client_1.UserRole.BILLER].includes(actor.role) &&
            actor.restaurantId === restaurant.id)
            return;
        throw new common_1.ForbiddenException('You do not have access to this restaurant');
    }
    assertCanEditRestaurant(actor, restaurant) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        if (actor.role === client_1.UserRole.OWNER && restaurant.ownerId === actor.id)
            return;
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN &&
            actor.restaurantId === restaurant.id)
            return;
        throw new common_1.ForbiddenException('You do not have permission to edit this restaurant');
    }
    assertCanManageStaff(actor, restaurant) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        if (actor.role === client_1.UserRole.OWNER && restaurant.ownerId === actor.id)
            return;
        if (actor.role === client_1.UserRole.RESTAURANT_ADMIN &&
            actor.restaurantId === restaurant.id)
            return;
        throw new common_1.ForbiddenException('You do not have permission to manage staff for this restaurant');
    }
    buildSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            + '-' + Date.now().toString(36);
    }
    async assertSlugAvailable(slug) {
        const existing = await this.prisma.restaurant.findUnique({ where: { slug } });
        if (existing) {
            throw new common_1.ConflictException(`Slug "${slug}" is already in use. Please choose a different slug.`);
        }
    }
    async upsertWorkingHours(restaurantId, hours) {
        await Promise.all(hours.map((wh) => this.prisma.workingHours.upsert({
            where: { restaurantId_day: { restaurantId, day: wh.day } },
            create: {
                restaurantId,
                day: wh.day,
                openTime: wh.openTime ?? null,
                closeTime: wh.closeTime ?? null,
                isClosed: wh.isClosed ?? false,
            },
            update: {
                openTime: wh.openTime ?? null,
                closeTime: wh.closeTime ?? null,
                isClosed: wh.isClosed ?? false,
            },
        })));
    }
    filterResponse(role, restaurant) {
        if (role === client_1.UserRole.SUPER_ADMIN || role === client_1.UserRole.OWNER) {
            return restaurant;
        }
        const { createdBy, createdById, ...safe } = restaurant;
        return safe;
    }
};
exports.RestaurantsService = RestaurantsService;
exports.RestaurantsService = RestaurantsService = RestaurantsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RestaurantsService);
//# sourceMappingURL=restaurants.service.js.map