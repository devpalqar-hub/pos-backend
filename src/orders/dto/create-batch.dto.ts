import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BatchItemDto {
    @ApiProperty({ description: 'Menu item UUID', example: 'uuid-of-menu-item' })
    @IsUUID()
    @IsNotEmpty()
    menuItemId: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    quantity: number;

    @ApiPropertyOptional({
        description: 'Special instructions for this specific item',
        example: 'Extra spicy, no onions',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}

export class CreateBatchDto {
    @ApiProperty({
        description: 'Items to include in this batch / round of ordering',
        type: [BatchItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BatchItemDto)
    items: BatchItemDto[];

    @ApiPropertyOptional({
        description: 'Kitchen-level note for the whole batch (e.g. "Rush this order")',
        example: 'Birthday table, please prioritise',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
