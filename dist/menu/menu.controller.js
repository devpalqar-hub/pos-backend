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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const menu_service_1 = require("./menu.service");
const create_menu_item_dto_1 = require("./dto/create-menu-item.dto");
const update_menu_item_dto_1 = require("./dto/update-menu-item.dto");
const stock_action_dto_1 = require("./dto/stock-action.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const prisma_1 = require("../../generated/prisma");
let MenuController = class MenuController {
    constructor(menuService) {
        this.menuService = menuService;
    }
    async create(actor, restaurantId, dto) {
        return {
            message: 'Menu item created successfully',
            data: await this.menuService.create(actor, restaurantId, dto),
        };
    }
    async findAll(actor, restaurantId, categoryId) {
        const data = categoryId
            ? await this.menuService.findByCategory(actor, restaurantId, categoryId)
            : await this.menuService.findAll(actor, restaurantId);
        return {
            message: 'Menu items fetched successfully',
            data,
        };
    }
    async findOne(actor, restaurantId, id) {
        return {
            message: 'Menu item fetched successfully',
            data: await this.menuService.findOne(actor, restaurantId, id),
        };
    }
    async update(actor, restaurantId, id, dto) {
        return {
            message: 'Menu item updated successfully',
            data: await this.menuService.update(actor, restaurantId, id, dto),
        };
    }
    async manageStock(actor, restaurantId, id, dto) {
        return {
            message: 'Stock action applied successfully',
            data: await this.menuService.manageStock(actor, restaurantId, id, dto),
        };
    }
    async remove(actor, restaurantId, id) {
        return this.menuService.remove(actor, restaurantId, id);
    }
};
exports.MenuController = MenuController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN, prisma_1.UserRole.CHEF),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a menu item',
        description: `
Creates a new item in the restaurant menu.

**Image workflow**: Upload image first via \`POST /upload/image?folder=menu-items\`, then pass the returned URL in \`imageUrl\`. Only **one image** per item.

**Item Types:**
- \`NON_STOCKABLE\` — No count. Admin/Chef marks it out-of-stock for the day; **auto-resets at midnight**.
- \`STOCKABLE\` — Tracks a unit count. Goes out-of-stock when count = 0. Requires \`stockCount\` on creation.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN, CHEF
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Menu item created.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error or missing stockCount for STOCKABLE.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant or category not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_menu_item_dto_1.CreateMenuItemDto]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiQuery)({
        name: 'categoryId',
        required: false,
        description: 'Filter by category UUID',
    }),
    (0, swagger_1.ApiOperation)({
        summary: 'List menu items for a restaurant',
        description: 'Returns all menu items ordered by category, then sortOrder, then name. ' +
            'Optionally filter by `categoryId`. Accessible by all roles assigned to the restaurant.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu items returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not assigned to this restaurant.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('categoryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Menu item UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a single menu item by ID',
        description: 'Returns full item details including category, restaurant info, stock status.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu item found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN, prisma_1.UserRole.CHEF),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Menu item UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a menu item',
        description: 'Update name, description, price, category, image, sort order, or active status. ' +
            'If a new `imageUrl` is provided, the previous S3 image is deleted automatically. ' +
            '**Note**: To change stock use the dedicated stock endpoint `POST /:id/stock`.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu item updated.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item, category or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_menu_item_dto_1.UpdateMenuItemDto]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/stock'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN, prisma_1.UserRole.CHEF),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Menu item UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Manage item stock / availability',
        description: `
Controls the availability of a menu item. Accessible by **RESTAURANT_ADMIN**, **CHEF** (and above).

### Actions

| Action | STOCKABLE | NON_STOCKABLE |
|--------|-----------|---------------|
| \`MARK_OUT_OF_STOCK\` | Sets count=0, flags OOS | Flags OOS — **auto-resets at midnight** |
| \`SET_STOCK\` | Sets absolute count *(requires quantity)* | ❌ Not applicable |
| \`DECREASE_STOCK\` | Reduces count by qty *(requires quantity)* | ❌ Not applicable |
| \`RESTOCK\` | Sets count to qty *(requires quantity)* | Clears OOS flag immediately |

**NON_STOCKABLE auto-restock**: A scheduled job runs every midnight and resets all NON_STOCKABLE items that were marked out-of-stock back to in-stock automatically.
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Stock action applied.' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Invalid action for item type, or missing quantity.',
    }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, stock_action_dto_1.StockActionDto]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "manageStock", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Menu item UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a menu item',
        description: 'Permanently deletes the item and removes its image from S3. ' +
            'To temporarily hide an item use `PATCH /:id` with `isActive: false` instead.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Menu item deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Menu item or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], MenuController.prototype, "remove", null);
exports.MenuController = MenuController = __decorate([
    (0, swagger_1.ApiTags)('Menu Items'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/menu'),
    __metadata("design:paramtypes", [menu_service_1.MenuService])
], MenuController);
//# sourceMappingURL=menu.controller.js.map