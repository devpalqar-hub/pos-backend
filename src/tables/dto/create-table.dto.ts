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
import { Type } from 'class-transformer';

export class CreateTableDto {
    @ApiProperty({
        description: 'Human-readable table identifier',
        example: 'Table 1',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({ description: 'Number of seats at this table', example: 4 })
    @IsInt()
    @Min(1)
    @Type(() => Number)
    seatCount: number;

    @ApiPropertyOptional({
        description: 'ID of the table group this table belongs to (optional)',
        example: 'uuid-of-table-group',
    })
    @IsOptional()
    @IsUUID()
    groupId?: string;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
