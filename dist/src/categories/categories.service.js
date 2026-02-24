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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const s3_service_1 = require("../s3/s3.service");
const client_1 = require("@prisma/client");
let CategoriesService = class CategoriesService {
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
    }
    async create(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const existing = await this.prisma.menuCategory.findUnique({
            where: { restaurantId_name: { restaurantId, name: dto.name } },
        });
        if (existing) {
            throw new common_1.ConflictException(`Category "${dto.name}" already exists in this restaurant`);
        }
        return this.prisma.menuCategory.create({
            data: {
                restaurantId,
                name: dto.name,
                description: dto.description ?? null,
                imageUrl: dto.imageUrl ?? null,
                sortOrder: dto.sortOrder ?? 0,
                createdById: actor.id,
            },
            include: { _count: { select: { items: true } } },
        });
    }
    async findAll(actor, restaurantId) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        return this.prisma.menuCategory.findMany({
            where: { restaurantId },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { items: true } } },
        });
    }
    async findOne(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const category = await this.prisma.menuCategory.findFirst({
            where: { id, restaurantId },
            include: {
                items: {
                    where: { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
                    select: {
                        id: true,
                        name: true,
                        price: true,
                        discountedPrice: true,
                        imageUrl: true,
                        itemType: true,
                        isOutOfStock: true,
                        isAvailable: true,
                        stockCount: true,
                    },
                },
                _count: { select: { items: true } },
            },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${id} not found in restaurant ${restaurantId}`);
        }
        return category;
    }
    async update(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const category = await this.prisma.menuCategory.findFirst({
            where: { id, restaurantId },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${id} not found in restaurant ${restaurantId}`);
        }
        if (dto.name && dto.name !== category.name) {
            const conflict = await this.prisma.menuCategory.findUnique({
                where: { restaurantId_name: { restaurantId, name: dto.name } },
            });
            if (conflict) {
                throw new common_1.ConflictException(`Category "${dto.name}" already exists in this restaurant`);
            }
        }
        if (dto.imageUrl && category.imageUrl && dto.imageUrl !== category.imageUrl) {
            await this.s3.deleteFile(category.imageUrl);
        }
        return this.prisma.menuCategory.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: { _count: { select: { items: true } } },
        });
    }
    async remove(actor, restaurantId, id) {
        this.assertAdminOrAbove(actor);
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const category = await this.prisma.menuCategory.findFirst({
            where: { id, restaurantId },
            include: { _count: { select: { items: true } } },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${id} not found in restaurant ${restaurantId}`);
        }
        if (category._count.items > 0) {
            throw new common_1.ForbiddenException(`Cannot delete category "${category.name}" — it has ${category._count.items} menu item(s). ` +
                `Move or delete the items first.`);
        }
        if (category.imageUrl)
            await this.s3.deleteFile(category.imageUrl);
        await this.prisma.menuCategory.delete({ where: { id } });
        return { message: `Category "${category.name}" deleted successfully` };
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
            (actor.role === client_1.UserRole.WAITER || actor.role === client_1.UserRole.CHEF || actor.role === client_1.UserRole.BILLER)) {
            throw new common_1.ForbiddenException('WAITER, CHEF and BILLER can only view categories, not create or edit them');
        }
    }
    assertAdminOrAbove(actor) {
        const allowed = [
            client_1.UserRole.SUPER_ADMIN,
            client_1.UserRole.OWNER,
            client_1.UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new common_1.ForbiddenException('Insufficient permissions to delete categories');
        }
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3_service_1.S3Service])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map