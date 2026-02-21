import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMenuItemDto {
  @ApiPropertyOptional({ description: 'Menu item name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'UUID of the new category to move this item to (must belong to the same restaurant)',
  })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Base price', minimum: 0.01 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({
    description: 'Discounted/offer price. Pass `null` to remove the discount.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountedPrice?: number;

  @ApiPropertyOptional({
    description:
      'New image URL (call POST /upload/image?folder=menu-items first). ' +
      'Old S3 image will be deleted automatically.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Display order within category (lower = first)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Soft-delete / restore the item (hidden from POS view when false)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
