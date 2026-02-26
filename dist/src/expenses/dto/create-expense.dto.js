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
exports.CreateExpenseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const client_1 = require("@prisma/client");
class CreateExpenseDto {
}
exports.CreateExpenseDto = CreateExpenseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the expense',
        example: 'Electricity Bill',
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Expense name is required' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "expenseName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Type of expense',
        enum: client_1.ExpenseType,
        example: client_1.ExpenseType.MONTHLY,
    }),
    (0, class_validator_1.IsEnum)(client_1.ExpenseType, { message: 'expenseType must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' }),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "expenseType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Expense amount',
        example: 1500.0,
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateExpenseDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Description or notes about the expense',
        example: 'Monthly electricity bill for January',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateExpenseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Date of the expense (defaults to now)',
        example: '2026-02-26T00:00:00.000Z',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    __metadata("design:type", Date)
], CreateExpenseDto.prototype, "date", void 0);
//# sourceMappingURL=create-expense.dto.js.map