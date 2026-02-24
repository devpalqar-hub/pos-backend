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
exports.CreateSessionDto = exports.OrderChannel = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var OrderChannel;
(function (OrderChannel) {
    OrderChannel["DINE_IN"] = "DINE_IN";
    OrderChannel["ONLINE_OWN"] = "ONLINE_OWN";
    OrderChannel["UBER_EATS"] = "UBER_EATS";
})(OrderChannel || (exports.OrderChannel = OrderChannel = {}));
class CreateSessionDto {
}
exports.CreateSessionDto = CreateSessionDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Table UUID (omit for online/delivery orders)',
        example: 'uuid-of-table',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "tableId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: OrderChannel,
        default: OrderChannel.DINE_IN,
        description: 'Order channel — determines online/delivery field requirements',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(OrderChannel),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "channel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'John Doe' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "customerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '+91 9876543210' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "customerPhone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'john@example.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "customerEmail", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 2, default: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateSessionDto.prototype, "guestCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'External platform order ID (e.g. Uber Eats order ref)',
        example: 'UBR-20250223-8A3C',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "externalOrderId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '123 Main St, Chennai, Tamil Nadu 600001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "deliveryAddress", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'No onions on the burger. Ring bell twice.' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSessionDto.prototype, "specialInstructions", void 0);
//# sourceMappingURL=create-session.dto.js.map