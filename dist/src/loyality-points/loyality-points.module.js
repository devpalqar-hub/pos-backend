"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyalityPointsModule = void 0;
const common_1 = require("@nestjs/common");
const loyality_points_controller_1 = require("./loyality-points.controller");
const loyality_points_service_1 = require("./loyality-points.service");
let LoyalityPointsModule = class LoyalityPointsModule {
};
exports.LoyalityPointsModule = LoyalityPointsModule;
exports.LoyalityPointsModule = LoyalityPointsModule = __decorate([
    (0, common_1.Module)({
        controllers: [loyality_points_controller_1.LoyalityPointsController],
        providers: [loyality_points_service_1.LoyalityPointsService],
        exports: [loyality_points_service_1.LoyalityPointsService],
    })
], LoyalityPointsModule);
//# sourceMappingURL=loyality-points.module.js.map