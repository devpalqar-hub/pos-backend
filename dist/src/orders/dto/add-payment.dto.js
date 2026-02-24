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
exports.AddPaymentDto = exports.PaymentMethod = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["UPI"] = "UPI";
    PaymentMethod["ONLINE"] = "ONLINE";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
class AddPaymentDto {
}
exports.AddPaymentDto = AddPaymentDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Payment amount', example: '450.00' }),
    (0, class_validator_1.IsDecimal)({ decimal_digits: '0,2' }),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], AddPaymentDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PaymentMethod, example: PaymentMethod.CARD }),
    (0, class_validator_1.IsEnum)(PaymentMethod),
    __metadata("design:type", String)
], AddPaymentDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Transaction reference (UPI UTR, card last 4 digits, etc.)',
        example: 'UTR20250223ABC123',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], AddPaymentDto.prototype, "reference", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Split payment — party 1' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], AddPaymentDto.prototype, "notes", void 0);
//# sourceMappingURL=add-payment.dto.js.map