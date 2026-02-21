import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export enum ItemTypeDto {
  STOCKABLE = 'STOCKABLE',
  NON_STOCKABLE = 'NON_STOCKABLE',
}

export class CreateMenuItemDto {
  // ─── Core ────────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Menu item name',
    example: 'Margherita Pizza',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Item name is required' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Item description',
    example: 'Classic tomato base with fresh mozzarella',
  })
  @IsOptional()
  @IsString()
  description?: string;

  // ─── Category ────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'UUID of the category this item belongs to (must belong to the same restaurant)',
    example: 'category-uuid',
  })
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

  // ─── Pricing ─────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Base price in the restaurant currency',
    example: 12.99,
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must be a number with max 2 decimal places' })
  @IsPositive({ message: 'price must be positive' })
  price: number;

  @ApiPropertyOptional({
    description: 'Discounted/offer price (must be less than base price)',
    example: 9.99,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountedPrice?: number;

  // ─── Image ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'Single image URL (upload first via POST /upload/image?folder=menu-items, then pass the URL here). ' +
      'Only one image per item is supported.',
    example: 'https://your-bucket.s3.us-east-1.amazonaws.com/menu-items/uuid.jpg',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  // ─── Item Type & Stock ────────────────────────────────────────────────────

  @ApiProperty({
    description: `
**STOCKABLE**: Tracks stock count. Goes out of stock when count reaches 0.
To restock call the stock management endpoint with action \`SET_STOCK\`.

**NON_STOCKABLE**: No count tracking. Admin/Chef manually marks it out-of-stock for the day
via the stock endpoint. It **automatically resets to in-stock at midnight** every day.
    `,
    enum: ItemTypeDto,
    example: ItemTypeDto.NON_STOCKABLE,
  })
  @IsEnum(ItemTypeDto, { message: 'itemType must be STOCKABLE or NON_STOCKABLE' })
  itemType: ItemTypeDto;

  @ApiPropertyOptional({
    description:
      'Initial stock count — **required when itemType is STOCKABLE**, ignored for NON_STOCKABLE.',
    example: 50,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number;

  // ─── Display ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Display order within category (lower = shown first)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
