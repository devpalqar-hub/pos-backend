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
exports.PriceRulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const price_rules_service_1 = require("./price-rules.service");
const create_price_rule_dto_1 = require("./dto/create-price-rule.dto");
const update_price_rule_dto_1 = require("./dto/update-price-rule.dto");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let PriceRulesController = class PriceRulesController {
    constructor(priceRulesService) {
        this.priceRulesService = priceRulesService;
    }
    create(actor, restaurantId, menuItemId, dto) {
        return this.priceRulesService.create(actor, restaurantId, menuItemId, dto);
    }
    findAll(actor, restaurantId, menuItemId) {
        return this.priceRulesService.findAllByMenuItem(actor, restaurantId, menuItemId);
    }
    getEffectivePrice(actor, restaurantId, menuItemId, atTime) {
        return this.priceRulesService.getEffectivePrice(actor, restaurantId, menuItemId, atTime ? new Date(atTime) : undefined);
    }
    findOne(actor, restaurantId, menuItemId, id) {
        return this.priceRulesService.findOne(actor, restaurantId, menuItemId, id);
    }
    update(actor, restaurantId, menuItemId, id, dto) {
        return this.priceRulesService.update(actor, restaurantId, menuItemId, id, dto);
    }
    remove(actor, restaurantId, menuItemId, id) {
        return this.priceRulesService.remove(actor, restaurantId, menuItemId, id);
    }
};
exports.PriceRulesController = PriceRulesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a price rule for a menu item' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'menuItemId', description: 'Menu item UUID' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Price rule created' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant or menu item not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('menuItemId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, create_price_rule_dto_1.CreatePriceRuleDto]),
    __metadata("design:returntype", void 0)
], PriceRulesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'List all price rules for a menu item' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'menuItemId', description: 'Menu item UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of price rules' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('menuItemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PriceRulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('effective-price'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({
        summary: 'Get the effective price for a menu item at a given moment',
        description: 'Evaluates all active price rules and returns the winning special price (or base price if no rule matches). Pass optional `atTime` ISO string to check a future/past moment.',
    }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'menuItemId', description: 'Menu item UUID' }),
    (0, swagger_1.ApiQuery)({
        name: 'atTime',
        required: false,
        description: 'ISO 8601 datetime to evaluate rules at (defaults to now)',
        example: '2025-12-01T10:30:00.000Z',
    }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Effective price with applied rule info' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('menuItemId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Query)('atTime')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PriceRulesController.prototype, "getEffectivePrice", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single price rule by ID' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'menuItemId', description: 'Menu item UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Price rule UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Price rule details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('menuItemId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PriceRulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Update a price rule' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'menuItemId', description: 'Menu item UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Price rule UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Updated price rule' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Validation error' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('menuItemId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, update_price_rule_dto_1.UpdatePriceRuleDto]),
    __metadata("design:returntype", void 0)
], PriceRulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a price rule' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiParam)({ name: 'menuItemId', description: 'Menu item UUID' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Price rule UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Price rule deleted' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('menuItemId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PriceRulesController.prototype, "remove", null);
exports.PriceRulesController = PriceRulesController = __decorate([
    (0, swagger_1.ApiTags)('Price Rules'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/menu/:menuItemId/price-rules'),
    __metadata("design:paramtypes", [price_rules_service_1.PriceRulesService])
], PriceRulesController);
//# sourceMappingURL=price-rules.controller.js.map