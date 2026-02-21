import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name (unique per restaurant)',
    example: 'Starters',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Short description of the category',
    example: 'Light bites to begin your meal',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description:
      'Public image URL (obtain by calling POST /upload/image with folder=categories first)',
    example:
      'https://your-bucket.s3.us-east-1.amazonaws.com/categories/uuid.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Display order (lower = shown first)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
