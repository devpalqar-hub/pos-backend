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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockActionDto = exports.StockAction = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var StockAction;
(function (StockAction) {
    StockAction["MARK_OUT_OF_STOCK"] = "MARK_OUT_OF_STOCK";
    StockAction["SET_STOCK"] = "SET_STOCK";
    StockAction["DECREASE_STOCK"] = "DECREASE_STOCK";
    StockAction["RESTOCK"] = "RESTOCK";
})(StockAction || (exports.StockAction = StockAction = {}));
class StockActionDto {
}
exports.StockActionDto = StockActionDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: `
Stock management action:
- **MARK_OUT_OF_STOCK** — Mark the item as unavailable. NON_STOCKABLE items auto-reset at midnight.
- **SET_STOCK** — Set absolute stock count *(STOCKABLE only, requires quantity)*
- **DECREASE_STOCK** — Decrease stock by an amount *(STOCKABLE only, requires quantity)*
- **RESTOCK** — Mark back in stock. NON_STOCKABLE: immediate. STOCKABLE: requires quantity.
    `,
        enum: StockAction,
        example: StockAction.MARK_OUT_OF_STOCK,
    }),
    (0, class_validator_1.IsEnum)(StockAction, {
        message: `action must be one of: ${Object.values(StockAction).join(', ')}`,
    }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], StockActionDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Quantity (required for SET_STOCK, DECREASE_STOCK, and RESTOCK on STOCKABLE items). ' +
            'Ignored for NON_STOCKABLE RESTOCK. Must be ≥ 0.',
        example: 20,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)({ message: 'quantity must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'quantity must be 0 or greater' }),
    __metadata("design:type", Number)
], StockActionDto.prototype, "quantity", void 0);
//# sourceMappingURL=stock-action.dto.js.map