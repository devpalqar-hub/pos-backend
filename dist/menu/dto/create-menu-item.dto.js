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
exports.CreateMenuItemDto = exports.ItemTypeDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ItemTypeDto;
(function (ItemTypeDto) {
    ItemTypeDto["STOCKABLE"] = "STOCKABLE";
    ItemTypeDto["NON_STOCKABLE"] = "NON_STOCKABLE";
})(ItemTypeDto || (exports.ItemTypeDto = ItemTypeDto = {}));
class CreateMenuItemDto {
}
exports.CreateMenuItemDto = CreateMenuItemDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Menu item name',
        example: 'Margherita Pizza',
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Item name is required' }),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Item description',
        example: 'Classic tomato base with fresh mozzarella',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'UUID of the category this item belongs to (must belong to the same restaurant)',
        example: 'category-uuid',
    }),
    (0, class_validator_1.IsUUID)('4', { message: 'categoryId must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'categoryId is required' }),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Base price in the restaurant currency',
        example: 12.99,
    }),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'price must be a number with max 2 decimal places' }),
    (0, class_validator_1.IsPositive)({ message: 'price must be positive' }),
    __metadata("design:type", Number)
], CreateMenuItemDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Discounted/offer price (must be less than base price)',
        example: 9.99,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }),
    (0, class_validator_1.IsPositive)(),
    __metadata("design:type", Number)
], CreateMenuItemDto.prototype, "discountedPrice", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Single image URL (upload first via POST /upload/image?folder=menu-items, then pass the URL here). ' +
            'Only one image per item is supported.',
        example: 'https://your-bucket.s3.us-east-1.amazonaws.com/menu-items/uuid.jpg',
        maxLength: 1000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(1000),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "imageUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: `
**STOCKABLE**: Tracks stock count. Goes out of stock when count reaches 0.
To restock call the stock management endpoint with action \`SET_STOCK\`.

**NON_STOCKABLE**: No count tracking. Admin/Chef manually marks it out-of-stock for the day
via the stock endpoint. It **automatically resets to in-stock at midnight** every day.
    `,
        enum: ItemTypeDto,
        example: ItemTypeDto.NON_STOCKABLE,
    }),
    (0, class_validator_1.IsEnum)(ItemTypeDto, { message: 'itemType must be STOCKABLE or NON_STOCKABLE' }),
    __metadata("design:type", String)
], CreateMenuItemDto.prototype, "itemType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Initial stock count — **required when itemType is STOCKABLE**, ignored for NON_STOCKABLE.',
        example: 50,
        minimum: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMenuItemDto.prototype, "stockCount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Display order within category (lower = shown first)',
        example: 1,
        default: 0,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateMenuItemDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=create-menu-item.dto.js.map