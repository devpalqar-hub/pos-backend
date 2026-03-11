import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator'

export class CreateExpenseCategoryDto {

    @ApiProperty({
        example: 'Utilities',
        description: 'Name of the expense category',
    })
    @IsString()
    name: string

    @ApiPropertyOptional({
        example: 'Electricity, water and gas bills',
    })
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({
        example: true,
        description: 'Indicates whether the category is active',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean

    @ApiPropertyOptional({
        example: '110201cd-698d-4ad9-9c63-4ea706d95f8f',
        description: 'Restaurant UUID associated with this category',
    })
    @IsOptional()
    @IsUUID()
    restaurantId?: string
}