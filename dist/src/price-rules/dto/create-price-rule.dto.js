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
exports.CreatePriceRuleDto = exports.DayOfWeek = exports.PriceRuleType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var PriceRuleType;
(function (PriceRuleType) {
    PriceRuleType["RECURRING_WEEKLY"] = "RECURRING_WEEKLY";
    PriceRuleType["LIMITED_TIME"] = "LIMITED_TIME";
})(PriceRuleType || (exports.PriceRuleType = PriceRuleType = {}));
var DayOfWeek;
(function (DayOfWeek) {
    DayOfWeek["MONDAY"] = "MONDAY";
    DayOfWeek["TUESDAY"] = "TUESDAY";
    DayOfWeek["WEDNESDAY"] = "WEDNESDAY";
    DayOfWeek["THURSDAY"] = "THURSDAY";
    DayOfWeek["FRIDAY"] = "FRIDAY";
    DayOfWeek["SATURDAY"] = "SATURDAY";
    DayOfWeek["SUNDAY"] = "SUNDAY";
})(DayOfWeek || (exports.DayOfWeek = DayOfWeek = {}));
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
class CreatePriceRuleDto {
}
exports.CreatePriceRuleDto = CreatePriceRuleDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Happy Hour Discount', maxLength: 255 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PriceRuleType, example: PriceRuleType.RECURRING_WEEKLY }),
    (0, class_validator_1.IsEnum)(PriceRuleType),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "ruleType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Special price (overrides base price when rule is active)',
        example: '9.99',
    }),
    (0, class_validator_1.IsDecimal)({ decimal_digits: '0,2' }),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "specialPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Start time in HH:mm format (24-hour)',
        example: '10:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(TIME_REGEX, { message: 'startTime must be in HH:mm format' }),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "startTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'End time in HH:mm format (24-hour)',
        example: '12:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(TIME_REGEX, { message: 'endTime must be in HH:mm format' }),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "endTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Days of week (required for RECURRING_WEEKLY)',
        type: [String],
        enum: DayOfWeek,
        example: [DayOfWeek.MONDAY, DayOfWeek.FRIDAY],
    }),
    (0, class_validator_1.ValidateIf)((o) => o.ruleType === PriceRuleType.RECURRING_WEEKLY),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(DayOfWeek, { each: true }),
    __metadata("design:type", Array)
], CreatePriceRuleDto.prototype, "days", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Start date ISO string (required for LIMITED_TIME)',
        example: '2025-12-01T00:00:00.000Z',
    }),
    (0, class_validator_1.ValidateIf)((o) => o.ruleType === PriceRuleType.LIMITED_TIME),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'End date ISO string (required for LIMITED_TIME)',
        example: '2025-12-31T23:59:59.000Z',
    }),
    (0, class_validator_1.ValidateIf)((o) => o.ruleType === PriceRuleType.LIMITED_TIME),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreatePriceRuleDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Higher priority wins when multiple rules are active',
        example: 1,
        default: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreatePriceRuleDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, default: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreatePriceRuleDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-price-rule.dto.js.map