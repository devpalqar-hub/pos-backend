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
var MenuService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const s3_service_1 = require("../s3/s3.service");
const stock_action_dto_1 = require("./dto/stock-action.dto");
const client_1 = require("@prisma/client");
const ITEM_INCLUDE = {
    category: { select: { id: true, name: true } },
    restaurant: { select: { id: true, name: true, currency: true } },
};
let MenuService = MenuService_1 = class MenuService {
    constructor(prisma, s3) {
        this.prisma = prisma;
        this.s3 = s3;
        this.logger = new common_1.Logger(MenuService_1.name);
    }
    async create(actor, restaurantId, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const category = await this.prisma.menuCategory.findFirst({
            where: { id: dto.categoryId, restaurantId },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${dto.categoryId} not found in restaurant ${restaurantId}`);
        }
        if (dto.itemType === 'STOCKABLE' && (dto.stockCount === undefined || dto.stockCount === null)) {
            throw new common_1.BadRequestException('stockCount is required for STOCKABLE items');
        }
        const isOutOfStock = dto.itemType === 'STOCKABLE' ? (dto.stockCount ?? 0) <= 0 : false;
        return this.prisma.menuItem.create({
            data: {
                restaurantId,
                categoryId: dto.categoryId,
                name: dto.name,
                description: dto.description ?? null,
                price: dto.price,
                discountedPrice: dto.discountedPrice ?? null,
                imageUrl: dto.imageUrl ?? null,
                itemType: dto.itemType,
                stockCount: dto.itemType === 'STOCKABLE' ? (dto.stockCount ?? 0) : null,
                isOutOfStock,
                sortOrder: dto.sortOrder ?? 0,
                createdById: actor.id,
            },
            include: ITEM_INCLUDE,
        });
    }
    resolveSort(sortBy) {
        switch (sortBy) {
            case 'newest':
                return [{ createdAt: 'desc' }];
            case 'oldest':
                return [{ createdAt: 'asc' }];
            case 'price_asc':
                return [{ price: 'asc' }];
            case 'price_desc':
                return [{ price: 'desc' }];
            case 'name_asc':
                return [{ name: 'asc' }];
            case 'name_desc':
                return [{ name: 'desc' }];
            default:
                return [{ category: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }];
        }
    }
    async findAll(actor, restaurantId, page = 1, limit = 10, search, sortBy) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.menuItem,
            page,
            limit,
            where: {
                restaurantId,
                ...(search && {
                    OR: [
                        {
                            name: {
                                contains: search
                            },
                        },
                        {
                            description: {
                                contains: search
                            },
                        },
                    ],
                }),
            },
            include: ITEM_INCLUDE,
            orderBy: this.resolveSort(sortBy),
        });
    }
    async findByCategory(actor, restaurantId, categoryId, page = 1, limit = 10, search, sortBy) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const category = await this.prisma.menuCategory.findFirst({
            where: { id: categoryId, restaurantId },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category ${categoryId} not found in restaurant ${restaurantId}`);
        }
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.menuItem,
            page,
            limit,
            where: {
                restaurantId,
                categoryId,
                isActive: true,
                ...(search && {
                    OR: [
                        {
                            name: {
                                contains: search,
                            },
                        },
                        {
                            description: {
                                contains: search,
                            },
                        },
                    ],
                }),
            },
            include: ITEM_INCLUDE,
            orderBy: sortBy
                ? this.resolveSort(sortBy)
                : [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
    }
    async findOne(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const item = await this.prisma.menuItem.findFirst({
            where: { id, restaurantId },
            include: ITEM_INCLUDE,
        });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item ${id} not found in restaurant ${restaurantId}`);
        }
        return item;
    }
    async update(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const item = await this.prisma.menuItem.findFirst({
            where: { id, restaurantId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item ${id} not found in restaurant ${restaurantId}`);
        }
        if (dto.categoryId && dto.categoryId !== item.categoryId) {
            const cat = await this.prisma.menuCategory.findFirst({
                where: { id: dto.categoryId, restaurantId },
            });
            if (!cat) {
                throw new common_1.NotFoundException(`Category ${dto.categoryId} not found in restaurant ${restaurantId}`);
            }
        }
        if (dto.imageUrl && item.imageUrl && dto.imageUrl !== item.imageUrl) {
            await this.s3.deleteFile(item.imageUrl);
        }
        return this.prisma.menuItem.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
                ...(dto.price !== undefined && { price: dto.price }),
                ...(dto.discountedPrice !== undefined && {
                    discountedPrice: dto.discountedPrice,
                }),
                ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: ITEM_INCLUDE,
        });
    }
    async manageStock(actor, restaurantId, id, dto) {
        if (![
            client_1.UserRole.SUPER_ADMIN,
            client_1.UserRole.OWNER,
            client_1.UserRole.RESTAURANT_ADMIN,
            client_1.UserRole.CHEF,
        ].includes(actor.role)) {
            throw new common_1.ForbiddenException('Only RESTAURANT_ADMIN and CHEF (and above) can manage stock');
        }
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const item = await this.prisma.menuItem.findFirst({
            where: { id, restaurantId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item ${id} not found in restaurant ${restaurantId}`);
        }
        let updateData = {};
        switch (dto.action) {
            case stock_action_dto_1.StockAction.MARK_OUT_OF_STOCK:
                updateData = {
                    isOutOfStock: true,
                    outOfStockAt: new Date(),
                    ...(item.itemType === client_1.ItemType.STOCKABLE && { stockCount: 0 }),
                };
                break;
            case stock_action_dto_1.StockAction.SET_STOCK:
                this.requireStockable(item, dto.action);
                this.requireQuantity(dto);
                updateData = {
                    stockCount: dto.quantity,
                    isOutOfStock: dto.quantity <= 0,
                    ...(dto.quantity > 0 && { outOfStockAt: null }),
                };
                break;
            case stock_action_dto_1.StockAction.DECREASE_STOCK:
                this.requireStockable(item, dto.action);
                this.requireQuantity(dto);
                {
                    const current = item.stockCount ?? 0;
                    const newCount = Math.max(0, current - dto.quantity);
                    updateData = {
                        stockCount: newCount,
                        isOutOfStock: newCount <= 0,
                        ...(newCount <= 0 && { outOfStockAt: new Date() }),
                    };
                }
                break;
            case stock_action_dto_1.StockAction.RESTOCK:
                if (item.itemType === client_1.ItemType.STOCKABLE) {
                    this.requireQuantity(dto);
                    updateData = {
                        stockCount: dto.quantity,
                        isOutOfStock: dto.quantity <= 0,
                        ...(dto.quantity > 0 && { outOfStockAt: null }),
                    };
                }
                else {
                    updateData = { isOutOfStock: false, outOfStockAt: null };
                }
                break;
        }
        const updated = await this.prisma.menuItem.update({
            where: { id },
            data: updateData,
            include: ITEM_INCLUDE,
        });
        this.logger.log(`[Stock] ${actor.email} → ${dto.action} on "${item.name}" (${item.itemType}) ` +
            `in restaurant ${restaurantId}`);
        return updated;
    }
    async remove(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const item = await this.prisma.menuItem.findFirst({
            where: { id, restaurantId },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item ${id} not found in restaurant ${restaurantId}`);
        }
        if (item.imageUrl)
            await this.s3.deleteFile(item.imageUrl);
        await this.prisma.menuItem.delete({ where: { id } });
        return { message: `Menu item "${item.name}" deleted successfully` };
    }
    async autoRestockNonStockable() {
        const result = await this.prisma.menuItem.updateMany({
            where: {
                itemType: client_1.ItemType.NON_STOCKABLE,
                isOutOfStock: true,
            },
            data: {
                isOutOfStock: false,
                outOfStockAt: null,
            },
        });
        if (result.count > 0) {
            this.logger.log(`[Cron] Auto-restocked ${result.count} NON_STOCKABLE menu item(s) at midnight`);
        }
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
            (actor.role === client_1.UserRole.WAITER || actor.role === client_1.UserRole.BILLER)) {
            throw new common_1.ForbiddenException('WAITER and BILLER cannot create or edit menu items');
        }
    }
    requireStockable(item, action) {
        if (item.itemType !== client_1.ItemType.STOCKABLE) {
            throw new common_1.BadRequestException(`Action "${action}" is only valid for STOCKABLE items. ` +
                `Item "${item.name}" is NON_STOCKABLE.`);
        }
    }
    requireQuantity(dto) {
        if (dto.quantity === undefined || dto.quantity === null) {
            throw new common_1.BadRequestException(`"quantity" is required for action "${dto.action}"`);
        }
    }
};
exports.MenuService = MenuService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MenuService.prototype, "autoRestockNonStockable", null);
exports.MenuService = MenuService = MenuService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        s3_service_1.S3Service])
], MenuService);
//# sourceMappingURL=menu.service.js.map