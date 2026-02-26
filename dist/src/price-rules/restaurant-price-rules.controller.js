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
exports.RestaurantPriceRulesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const price_rules_service_1 = require("./price-rules.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let RestaurantPriceRulesController = class RestaurantPriceRulesController {
    constructor(priceRulesService) {
        this.priceRulesService = priceRulesService;
    }
    getAllByRestaurantId(actor, restaurantId, page, limit, ruleType, isActive, menuItemId) {
        const pageNum = parseInt(page ?? '1');
        const limitNum = parseInt(limit ?? '10');
        const isActiveValue = isActive !== undefined ? isActive === 'true' : undefined;
        return this.priceRulesService.findAllByRestaurant(actor, restaurantId, pageNum, limitNum, ruleType, isActiveValue, menuItemId);
    }
};
exports.RestaurantPriceRulesController = RestaurantPriceRulesController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(client_1.UserRole.SUPER_ADMIN, client_1.UserRole.OWNER, client_1.UserRole.RESTAURANT_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all price rules for a restaurant' }),
    (0, swagger_1.ApiParam)({ name: 'restaurantId', description: 'Restaurant UUID' }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' }),
    (0, swagger_1.ApiQuery)({ name: 'ruleType', required: false, type: String, enum: ['RECURRING_WEEKLY', 'LIMITED_TIME'], description: 'Filter by rule type' }),
    (0, swagger_1.ApiQuery)({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' }),
    (0, swagger_1.ApiQuery)({ name: 'menuItemId', required: false, type: String, description: 'Filter by menu item UUID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of all price rules for the restaurant' }),
    (0, swagger_1.ApiResponse)({ status: 403, description: 'Forbidden' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Restaurant not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('restaurantId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('ruleType')),
    __param(5, (0, common_1.Query)('isActive')),
    __param(6, (0, common_1.Query)('menuItemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], RestaurantPriceRulesController.prototype, "getAllByRestaurantId", null);
exports.RestaurantPriceRulesController = RestaurantPriceRulesController = __decorate([
    (0, swagger_1.ApiTags)('Price Rules'),
    (0, swagger_1.ApiBearerAuth)('Bearer'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('restaurants/:restaurantId/price-rules'),
    __metadata("design:paramtypes", [price_rules_service_1.PriceRulesService])
], RestaurantPriceRulesController);
//# sourceMappingURL=restaurant-price-rules.controller.js.map