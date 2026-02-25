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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async create(actor, dto) {
        return {
            message: 'User created successfully',
            data: await this.usersService.create(actor, dto),
        };
    }
    async findAll(actor, page, limit) {
        const pageNum = parseInt(page ?? '1');
        const limitNum = parseInt(limit ?? '10');
        return {
            message: 'Users fetched successfully',
            data: await this.usersService.findAll(actor, pageNum, limitNum),
        };
    }
    async getProfile(actor) {
        return {
            message: 'Profile fetched successfully',
            data: await this.usersService.getProfile(actor),
        };
    }
    async updateProfile(actor, dto) {
        return {
            message: 'Profile updated successfully',
            data: await this.usersService.updateProfile(actor, dto),
        };
    }
    async findOne(actor, id) {
        return {
            message: 'User fetched successfully',
            data: await this.usersService.findOne(actor, id),
        };
    }
    async update(actor, id, dto) {
        return {
            message: 'User updated successfully',
            data: await this.usersService.update(actor, id, dto),
        };
    }
    async remove(actor, id) {
        return this.usersService.remove(actor, id);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({
        summary: 'Create a new user',
        description: `
**Role-based creation rules:**
- **SUPER_ADMIN**: Can create any role (SUPER_ADMIN, OWNER, RESTAURANT_ADMIN, WAITER, CHEF)
- **OWNER**: Can create RESTAURANT_ADMIN, WAITER, CHEF under their own restaurants
- **RESTAURANT_ADMIN**: Can create WAITER, CHEF in their assigned restaurant
- **WAITER / CHEF**: Cannot create users
    `,
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'User created successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error or missing restaurantId.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email already in use.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'List users',
        description: `
Returns users visible to the authenticated user:
- **SUPER_ADMIN**: All users in the system (full details)
- **OWNER**: All staff in their restaurants (with creation context)
- **RESTAURANT_ADMIN**: Staff in their assigned restaurant
- **WAITER / CHEF**: Only their own profile
    `,
    }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User list returned.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Get own profile' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile returned.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('profile'),
    (0, swagger_1.ApiOperation)({
        summary: 'Update own profile',
        description: 'All roles can update their own name.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Profile updated.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a user by ID',
        description: 'Response fields are filtered based on your role. ' +
            'WAITER/CHEF can only fetch their own profile.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User UUID', type: 'string' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User found.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Access denied.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a user',
        description: `
**Role-based update rules:**
- **SUPER_ADMIN**: Can update any field on any user (including role, isActive)
- **OWNER**: Can update staff in their restaurants (name, email, restaurantId, isActive)
- **RESTAURANT_ADMIN**: Can update WAITER/CHEF in their assigned restaurant (name, email)
- **WAITER / CHEF**: Use \`PATCH /users/profile\` to update their own name
    `,
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User UUID', type: 'string' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User updated.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a user',
        description: '**SUPER_ADMIN**: Can delete any user. ' +
            '**OWNER**: Can delete staff in their restaurants. ' +
            'You cannot delete your own account.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'User UUID', type: 'string' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Insufficient permissions or self-deletion.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found.' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
exports.UsersController = UsersController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map