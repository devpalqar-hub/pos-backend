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
exports.CreateRestaurantDto = exports.WorkingHoursEntryDto = exports.DayOfWeek = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
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
class WorkingHoursEntryDto {
}
exports.WorkingHoursEntryDto = WorkingHoursEntryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Day of the week',
        enum: DayOfWeek,
        example: DayOfWeek.MONDAY,
    }),
    (0, class_validator_1.IsEnum)(DayOfWeek),
    __metadata("design:type", String)
], WorkingHoursEntryDto.prototype, "day", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Opening time in 24-hr HH:MM format',
        example: '09:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], WorkingHoursEntryDto.prototype, "openTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Closing time in 24-hr HH:MM format',
        example: '22:00',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], WorkingHoursEntryDto.prototype, "closeTime", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Mark this day as closed (overrides openTime/closeTime)',
        example: false,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], WorkingHoursEntryDto.prototype, "isClosed", void 0);
class CreateRestaurantDto {
}
exports.CreateRestaurantDto = CreateRestaurantDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Restaurant display name',
        example: 'The Golden Fork',
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Restaurant name is required' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL-friendly slug (auto-generated from name if not provided). Must be unique.',
        example: 'the-golden-fork',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "slug", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Short description of the restaurant',
        example: 'Fine dining with a modern twist.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID of the OWNER user to assign this restaurant to',
        example: 'owner-uuid',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'ownerId must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'ownerId is required' }),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "ownerId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Phone number', example: '+1-800-555-0199' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(30),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Contact email', example: 'info@goldenfork.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Website URL', example: 'https://goldenfork.com' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "website", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Street address', example: '123 Main St' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'City', example: 'New York' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'State / Province', example: 'NY' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "state", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Country', example: 'USA' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Postal / ZIP code', example: '10001' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "postalCode", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'GPS latitude', example: 40.7128 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(90),
    __metadata("design:type", Number)
], CreateRestaurantDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'GPS longitude', example: -74.006 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180),
    (0, class_validator_1.Max)(180),
    __metadata("design:type", Number)
], CreateRestaurantDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Logo image URL', example: 'https://cdn.example.com/logo.png' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "logoUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Cover / banner image URL', example: 'https://cdn.example.com/cover.jpg' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "coverUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Type of cuisine served',
        example: 'Italian, French Fusion',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "cuisineType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Maximum seating capacity', example: 120 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateRestaurantDto.prototype, "maxCapacity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Tax rate percentage (e.g. 8.5 for 8.5%)',
        example: 8.5,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateRestaurantDto.prototype, "taxRate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Currency code (ISO 4217)',
        example: 'USD',
        default: 'USD',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(10),
    __metadata("design:type", String)
], CreateRestaurantDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Weekly working hours schedule. Provide entries for each day you want to configure. ' +
            'Omitted days will have no schedule set.',
        type: [WorkingHoursEntryDto],
        example: [
            { day: 'MONDAY', openTime: '09:00', closeTime: '22:00', isClosed: false },
            { day: 'SUNDAY', isClosed: true },
        ],
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => WorkingHoursEntryDto),
    __metadata("design:type", Array)
], CreateRestaurantDto.prototype, "workingHours", void 0);
//# sourceMappingURL=create-restaurant.dto.js.map