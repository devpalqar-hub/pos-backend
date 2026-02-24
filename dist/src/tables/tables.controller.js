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
exports.TablesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const tables_service_1 = require("./tables.service");
const create_table_dto_1 = require("./dto/create-table.dto");
const update_table_dto_1 = require("./dto/update-table.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let TablesController = class TablesController {
    constructor(tablesService) {
        this.tablesService = tablesService;
    }
    create(actor, restaurantId, dto) {
        return this.tablesService.createTable(actor, restaurantId, dto);
    }
    findAll(actor, restaurantId, groupId) {
        if (groupId === 'ungrouped') {
            return this.tablesService.findUngroupedTables(actor, restaurantId);
        }
        return this.tablesService.findAllTables(actor, restaurantId, groupId);
    }
    findOne(actor, restaurantId, id) {
        return this.tablesService.findOneTable(actor, restaurantId, id);
    }
    update(actor, restaurantId, id, dto) {
        return this.tablesService.updateTable(actor, restaurantId, id, dto);
    }
    remove(actor, restaurantId, id) {
        return this.tablesService.removeTable(actor, restaurantId, id);
    }
    assignGroup(actor, restaurantId, id, groupId) {
        return this.tablesService.assignTableToGroup(actor, restaurantId, id, groupId ?? null);
    }
};
exports.TablesController = TablesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new table in the restaurant' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Table created' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Table name already exists' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_table_dto_1.CreateTableDto]),
    __metadata("design:returntype", void 0)
], TablesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER, client_1.UserRole.CHEF, client_1.UserRole.BILLER),
    (0, swagger_1.ApiOperation)({
        summary: 'List all tables for a restaurant',
        description: 'Optionally filter by `groupId`. Pass `groupId=ungrouped` to list tables with no group.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiQuery)({
        name: 'groupId',
        required: false,
        description: 'Filter by table group UUID. Use "ungrouped" for tables without a group.',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of tables' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TablesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN, client_1.UserRole.WAITER, client_1.UserRole.CHEF, client_1.UserRole.BILLER),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single table by ID' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Table details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TablesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Update a table',
        description: 'Set `groupId` to `null` to unassign from group.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated table' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_table_dto_1.UpdateTableDto]),
    __metadata("design:returntype", void 0)
], TablesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a table' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Deleted' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], TablesController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/group'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Assign or unassign a table from a group',
        description: 'Send `{ "groupId": "<uuid>" }` to assign or `{ "groupId": null }` to unassign.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Table UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Table group assignment updated' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)('groupId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], TablesController.prototype, "assignGroup", null);
exports.TablesController = TablesController = __decorate([
    (0, swagger_1.ApiTags)('Tables'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/tables'),
    __metadata("design:paramtypes", [tables_service_1.TablesService])
], TablesController);
//# sourceMappingURL=tables.controller.js.map