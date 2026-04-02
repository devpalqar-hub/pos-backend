import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorCategoryDto {
    @ApiProperty({
        description: 'Vendor category name',
        example: 'Dairy Suppliers',
        maxLength: 100,
    })
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Optional description for this category',
        example: 'Suppliers for milk, cheese, and related dairy products',
    })
    @IsOptional()
    @IsString()
    description?: string;
}