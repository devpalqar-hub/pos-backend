import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOvertimeDto {
    @ApiPropertyOptional({
        description: 'Date of overtime (ISO 8601 date)',
        example: '2026-02-20',
    })
    @IsOptional()
    @Type(() => Date)
    date?: Date;

    @ApiPropertyOptional({
        description: 'Number of overtime hours',
        example: 2.5,
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Overtime hours must be greater than 0' })
    @Type(() => Number)
    hours?: number;

    @ApiPropertyOptional({
        description: 'Total wage amount for this overtime entry',
        example: 500.0,
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    wageAmount?: number;

    @ApiPropertyOptional({
        description: 'Notes about the overtime',
        example: 'Weekend shift coverage',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}
