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
exports.LoyalityPointsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const loyality_points_service_1 = require("./loyality-points.service");
const create_loyality_point_dto_1 = require("./dto/create-loyality-point.dto");
const update_loyality_point_dto_1 = require("./dto/update-loyality-point.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let LoyalityPointsController = class LoyalityPointsController {
    constructor(loyalityPointsService) {
        this.loyalityPointsService = loyalityPointsService;
    }
    async create(actor, restaurantId, dto) {
        return {
            message: 'Loyalty point rule created successfully',
            data: await this.loyalityPointsService.create(actor, restaurantId, dto),
        };
    }
    async findAll(actor, restaurantId, page, limit) {
        return {
            message: 'Loyalty point rules fetched successfully',
            data: await this.loyalityPointsService.findAll(actor, restaurantId, parseInt(page ?? '1'), parseInt(limit ?? '10')),
        };
    }
    async findOne(actor, restaurantId, id) {
        return {
            message: 'Loyalty point rule fetched successfully',
            data: await this.loyalityPointsService.findOne(actor, restaurantId, id),
        };
    }
    async update(actor, restaurantId, id, dto) {
        return {
            message: 'Loyalty point rule updated successfully',
            data: await this.loyalityPointsService.update(actor, restaurantId, id, dto),
        };
    }
    async remove(actor, restaurantId, id) {
        return await this.loyalityPointsService.remove(actor, restaurantId, id);
    }
};
exports.LoyalityPointsController = LoyalityPointsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a loyalty point rule',
        description: `
Creates a new loyalty point rule for the specified restaurant.  
All time/date/day fields are optional. When omitted the rule applies unconditionally.

- **maxUsagePerCustomer**: max redemptions per customer (null = unlimited)

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Loyalty point rule created.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_loyality_point_dto_1.CreateLoyalityPointDto]),
    __metadata("design:returntype", Promise)
], LoyalityPointsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiOperation)({
        summary: 'List all loyalty point rules for a restaurant',
        description: 'Returns all loyalty point rules ordered by creation date (newest first), with pagination.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loyalty point list returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Not assigned to this restaurant.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], LoyalityPointsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Loyalty point rule UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a loyalty point rule by ID',
        description: 'Returns the loyalty point rule details.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loyalty point rule found.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Rule or restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LoyalityPointsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Loyalty point rule UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a loyalty point rule',
        description: 'Updates loyalty point rule details.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Loyalty point rule updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Rule not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_loyality_point_dto_1.UpdateLoyalityPointDto]),
    __metadata("design:returntype", Promise)
], LoyalityPointsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Loyalty point rule UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a loyalty point rule',
        description: 'Permanently removes a loyalty point rule and all its associations.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Rule deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Rule not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LoyalityPointsController.prototype, "remove", null);
exports.LoyalityPointsController = LoyalityPointsController = __decorate([
    (0, swagger_1.ApiTags)('Loyality Points'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/loyality-points'),
    __metadata("design:paramtypes", [loyality_points_service_1.LoyalityPointsService])
], LoyalityPointsController);
//# sourceMappingURL=loyality-points.controller.js.map