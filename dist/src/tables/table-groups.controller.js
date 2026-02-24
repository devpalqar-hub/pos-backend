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
exports.TableGroupsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tables_service_1 = require("./tables.service");
const create_table_group_dto_1 = require("./dto/create-table-group.dto");
const update_table_group_dto_1 = require("./dto/update-table-group.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let TableGroupsController = class TableGroupsController {
    constructor(tablesService) {
        this.tablesService = tablesService;
    }
    create(actor, restaurantId, dto) {
        return this.tablesService.createGroup(actor, restaurantId, dto);
    }
    findAll(actor, restaurantId) {
        return this.tablesService.findAllGroups(actor, restaurantId);
    }
    findOne(actor, restaurantId, id) {
        return this.tablesService.findOneGroup(actor, restaurantId, id);
    }
    update(actor, restaurantId, id, dto) {
        return this.tablesService.updateGroup(actor, restaurantId, id, dto);
    }
    remove(actor, restaurantId, id) {
        return this.tablesService.removeGroup(actor, restaurantId, id);
    }
};
exports.TableGroupsController = TableGroupsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a table group (floor / section)' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Table group created' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Name already exists in this restaurant' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_table_group_dto_1.CreateTableGroupDto]),
    __metadata("design:returntype", void 0)
], TableGroupsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER, client_1.UserRole.CHEF, client_1.UserRole.BILLER),
    (0, swagger_1.ApiOperation)({
        summary: 'List all table groups for a restaurant (includes tables)',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of table groups' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TableGroupsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER, client_1.UserRole.CHEF, client_1.UserRole.BILLER),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single table group with its tables' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table group UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Table group details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TableGroupsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update a table group' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table group UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated table group' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_table_group_dto_1.UpdateTableGroupDto]),
    __metadata("design:returntype", void 0)
], TableGroupsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Delete a table group',
        description: 'Group must have no tables assigned to it before deletion.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table group UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Deleted' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Group still has tables' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TableGroupsController.prototype, "remove", null);
exports.TableGroupsController = TableGroupsController = __decorate([
    (0, swagger_1.ApiTags)('Table Groups'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/table-groups'),
    __metadata("design:paramtypes", [tables_service_1.TablesService])
], TableGroupsController);
//# sourceMappingURL=table-groups.controller.js.map