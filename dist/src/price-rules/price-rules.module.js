"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceRulesModule = void 0;
const common_1 = require("@nestjs/common");
const price_rules_service_1 = require("./price-rules.service");
const price_rules_controller_1 = require("./price-rules.controller");
const restaurant_price_rules_controller_1 = require("./restaurant-price-rules.controller");
let PriceRulesModule = class PriceRulesModule {
};
exports.PriceRulesModule = PriceRulesModule;
exports.PriceRulesModule = PriceRulesModule = __decorate([
    (0, common_1.Module)({
        controllers: [price_rules_controller_1.PriceRulesController, restaurant_price_rules_controller_1.RestaurantPriceRulesController],
        providers: [price_rules_service_1.PriceRulesService],
        exports: [price_rules_service_1.PriceRulesService],
    })
], PriceRulesModule);
//# sourceMappingURL=price-rules.module.js.map