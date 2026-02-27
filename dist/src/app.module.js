"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const restaurants_module_1 = require("./restaurants/restaurants.module");
const common_module_1 = require("./common/common.module");
const categories_module_1 = require("./categories/categories.module");
const menu_module_1 = require("./menu/menu.module");
const price_rules_module_1 = require("./price-rules/price-rules.module");
const tables_module_1 = require("./tables/tables.module");
const orders_module_1 = require("./orders/orders.module");
const customers_module_1 = require("./customers/customers.module");
const loyality_points_module_1 = require("./loyality-points/loyality-points.module");
const expenses_module_1 = require("./expenses/expenses.module");
const payroll_module_1 = require("./payroll/payroll.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const s3_module_1 = require("./s3/s3.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            prisma_module_1.PrismaModule,
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            restaurants_module_1.RestaurantsModule,
            s3_module_1.S3Module,
            categories_module_1.CategoriesModule,
            menu_module_1.MenuModule,
            price_rules_module_1.PriceRulesModule,
            tables_module_1.TablesModule,
            orders_module_1.OrdersModule,
            customers_module_1.CustomersModule,
            loyality_points_module_1.LoyalityPointsModule,
            expenses_module_1.ExpensesModule,
            payroll_module_1.PayrollModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            { provide: core_1.APP_GUARD, useClass: jwt_auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_FILTER, useClass: http_exception_filter_1.HttpExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: transform_interceptor_1.TransformInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map