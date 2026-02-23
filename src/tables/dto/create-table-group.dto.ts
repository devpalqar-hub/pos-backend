import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTableGroupDto {
    @ApiProperty({ example: 'Ground Floor', maxLength: 255 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ example: 'Main dining area on the ground floor' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Hex color code for floor-plan UI (optional)',
        example: '#FF5733',
    })
    @IsOptional()
    @IsString()
    @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
        message: 'color must be a valid hex color (e.g. #FF5733 or #F73)',
    })
    @MaxLength(20)
    color?: string;

    @ApiPropertyOptional({ example: 0, default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    sortOrder?: number;

    @ApiPropertyOptional({ example: true, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
