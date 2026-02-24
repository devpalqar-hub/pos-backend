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
exports.UpdateItemStatusDto = exports.OrderItemStatus = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var OrderItemStatus;
(function (OrderItemStatus) {
    OrderItemStatus["PENDING"] = "PENDING";
    OrderItemStatus["PREPARING"] = "PREPARING";
    OrderItemStatus["PREPARED"] = "PREPARED";
    OrderItemStatus["SERVED"] = "SERVED";
    OrderItemStatus["CANCELLED"] = "CANCELLED";
})(OrderItemStatus || (exports.OrderItemStatus = OrderItemStatus = {}));
class UpdateItemStatusDto {
}
exports.UpdateItemStatusDto = UpdateItemStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: OrderItemStatus,
        description: 'PREPARING and PREPARED are optional steps.\n' +
            'Chef: PENDING → PREPARING → PREPARED\n' +
            'Waiter: PREPARED → SERVED  (or PENDING → SERVED directly)\n' +
            'Either: any → CANCELLED',
    }),
    (0, class_validator_1.IsEnum)(OrderItemStatus),
    __metadata("design:type", String)
], UpdateItemStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Required when status is CANCELLED',
        example: 'Customer changed mind',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], UpdateItemStatusDto.prototype, "cancelReason", void 0);
//# sourceMappingURL=update-item-status.dto.js.map