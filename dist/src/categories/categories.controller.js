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
exports.CategoriesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const categories_service_1 = require("./categories.service");
const create_category_dto_1 = require("./dto/create-category.dto");
const update_category_dto_1 = require("./dto/update-category.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let CategoriesController = class CategoriesController {
    constructor(categoriesService) {
        this.categoriesService = categoriesService;
    }
    async create(actor, restaurantId, dto) {
        return {
            message: 'Category created successfully',
            data: await this.categoriesService.create(actor, restaurantId, dto),
        };
    }
    async findAll(actor, restaurantId) {
        return {
            message: 'Categories fetched successfully',
            data: await this.categoriesService.findAll(actor, restaurantId),
        };
    }
    async findOne(actor, restaurantId, id) {
        return {
            message: 'Category fetched successfully',
            data: await this.categoriesService.findOne(actor, restaurantId, id),
        };
    }
    async update(actor, restaurantId, id, dto) {
        return {
            message: 'Category updated successfully',
            data: await this.categoriesService.update(actor, restaurantId, id, dto),
        };
    }
    async remove(actor, restaurantId, id) {
        return this.categoriesService.remove(actor, restaurantId, id);
    }
};
exports.CategoriesController = CategoriesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a menu category',
        description: `
Creates a new category for the specified restaurant. Category names are **unique per restaurant**.

**Image**: First upload the image via \`POST /upload/image?folder=categories\`, then pass the returned URL in \`imageUrl\`.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Category created.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Category name already exists in this restaurant.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_category_dto_1.CreateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'List all categories for a restaurant',
        description: 'Returns all categories ordered by `sortOrder` then name. ' +
            'Includes item count per category. Accessible by all roles assigned to the restaurant.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category list returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not assigned to this restaurant.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Category UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a category with its active menu items',
        description: 'Returns the category details plus all active items belonging to it (sorted by sortOrder).',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Category UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a category',
        description: 'Update name, description, image, sort order, or active status. ' +
            'If a new `imageUrl` is provided, the old S3 image is automatically deleted.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category updated.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category or restaurant not found.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Category name already exists in this restaurant.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_category_dto_1.UpdateCategoryDto]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Category UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a category',
        description: 'Deletes a category **only if it has no menu items**. ' +
            'Remove or reassign all items first. S3 image is deleted automatically.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Category deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Category still has items, or insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Category or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CategoriesController.prototype, "remove", null);
exports.CategoriesController = CategoriesController = __decorate([
    (0, swagger_1.ApiTags)('Categories'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/categories'),
    __metadata("design:paramtypes", [categories_service_1.CategoriesService])
], CategoriesController);
//# sourceMappingURL=categories.controller.js.map