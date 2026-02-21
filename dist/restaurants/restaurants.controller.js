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
exports.RestaurantsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const restaurants_service_1 = require("./restaurants.service");
const create_restaurant_dto_1 = require("./dto/create-restaurant.dto");
const update_restaurant_dto_1 = require("./dto/update-restaurant.dto");
const assign_staff_dto_1 = require("./dto/assign-staff.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const prisma_1 = require("../../generated/prisma");
let RestaurantsController = class RestaurantsController {
    constructor(restaurantsService) {
        this.restaurantsService = restaurantsService;
    }
    async create(actor, dto) {
        return {
            message: 'Restaurant created successfully',
            data: await this.restaurantsService.create(actor, dto),
        };
    }
    async findAll(actor) {
        return {
            message: 'Restaurants fetched successfully',
            data: await this.restaurantsService.findAll(actor),
        };
    }
    async findOne(actor, id) {
        return {
            message: 'Restaurant fetched successfully',
            data: await this.restaurantsService.findOne(actor, id),
        };
    }
    async update(actor, id, dto) {
        return {
            message: 'Restaurant updated successfully',
            data: await this.restaurantsService.update(actor, id, dto),
        };
    }
    async remove(actor, id) {
        return this.restaurantsService.remove(actor, id);
    }
    async getStaff(actor, id) {
        return {
            message: 'Staff fetched successfully',
            data: await this.restaurantsService.getStaff(actor, id),
        };
    }
    async assignStaff(actor, id, dto) {
        return this.restaurantsService.assignStaff(actor, id, dto);
    }
    async removeStaff(actor, id, dto) {
        return this.restaurantsService.removeStaff(actor, id, dto);
    }
    async getWorkingHours(actor, id) {
        return {
            message: 'Working hours fetched successfully',
            data: await this.restaurantsService.getWorkingHours(actor, id),
        };
    }
};
exports.RestaurantsController = RestaurantsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new restaurant',
        description: `
**SUPER_ADMIN only.**

Creates a restaurant and immediately assigns it to an existing **OWNER** user.
Optionally supply the full weekly working hours schedule in the same request.

**Slug**: Auto-generated from the restaurant name if not provided. Must be globally unique.
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Restaurant created successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error or target user is not an OWNER.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Owner user not found.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Slug already in use.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_restaurant_dto_1.CreateRestaurantDto]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List restaurants',
        description: `
Returns restaurants visible to the authenticated user:

| Role | Visible restaurants |
|------|-------------------|
| SUPER_ADMIN | All restaurants |
| OWNER | Only their own restaurants |
| RESTAURANT_ADMIN / WAITER / CHEF | Only their assigned restaurant |
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Restaurant list returned.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a restaurant by ID',
        description: 'Returns full restaurant details including working hours and staff count. ' +
            'Internal metadata (createdBy) is hidden from non-admin roles.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Restaurant found.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Update restaurant details',
        description: `
**Role-based update rules:**
- **SUPER_ADMIN**: Can update any field, including \`ownerId\` (ownership transfer) and \`isActive\`
- **OWNER**: Can update all fields of their own restaurants except \`ownerId\`; can toggle \`isActive\`
- **RESTAURANT_ADMIN**: Can update basic info (name, contact, address, description, branding, working hours) in their assigned restaurant

Working hours are **upserted** — supplying days overwrites those days, unmentioned days are left unchanged.
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Restaurant updated.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Slug already in use.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_restaurant_dto_1.UpdateRestaurantDto]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a restaurant',
        description: '**SUPER_ADMIN only.** ' +
            'Deletes the restaurant and automatically unassigns all staff members. ' +
            'Working hours are cascade-deleted.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Restaurant deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Only Super Admin can delete restaurants.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/staff'),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'List staff assigned to a restaurant',
        description: 'Returns all users (RESTAURANT_ADMIN, WAITER, CHEF) assigned to this restaurant.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Staff list returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "getStaff", null);
__decorate([
    (0, common_1.Post)(':id/staff/assign'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Assign a user to this restaurant',
        description: `
Assigns an existing user to this restaurant by setting their \`restaurantId\`.

**Rules:**
- **SUPER_ADMIN**: Can assign any staff user to any restaurant
- **OWNER**: Can assign staff to their own restaurants only
- **RESTAURANT_ADMIN**: Can assign WAITER/CHEF to their own restaurant only
- Cannot assign SUPER_ADMIN or OWNER roles as restaurant staff
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User assigned to restaurant.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot assign SUPER_ADMIN/OWNER as staff.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant or user not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_staff_dto_1.AssignStaffDto]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "assignStaff", null);
__decorate([
    (0, common_1.Post)(':id/staff/remove'),
    (0, roles_decorator_1.Roles)(prisma_1.UserRole.SUPER_ADMIN, prisma_1.UserRole.OWNER, prisma_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Remove a user from this restaurant',
        description: 'Unassigns a user from this restaurant (sets their restaurantId to null). ' +
            'The user account is NOT deleted.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User removed from restaurant.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'User is not assigned to this restaurant.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant or user not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_staff_dto_1.RemoveStaffDto]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "removeStaff", null);
__decorate([
    (0, common_1.Get)(':id/working-hours'),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiOperation)({
        summary: 'Get working hours for a restaurant',
        description: 'Returns the weekly working hours schedule, ordered by day of week. ' +
            'Accessible by all roles that can view the restaurant.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Working hours returned.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], RestaurantsController.prototype, "getWorkingHours", null);
exports.RestaurantsController = RestaurantsController = __decorate([
    (0, swagger_1.ApiTags)('Restaurants'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants'),
    __metadata("design:paramtypes", [restaurants_service_1.RestaurantsService])
], RestaurantsController);
//# sourceMappingURL=restaurants.controller.js.map