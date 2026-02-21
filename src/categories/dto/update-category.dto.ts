import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name (unique per restaurant)', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Short description of the category' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Updated image URL (call POST /upload/image?folder=categories first, then pass the returned URL here). ' +
      'Previous image will be deleted from S3 automatically.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Display order (lower = shown first)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Activate or deactivate the category (hides all items from POS view)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
