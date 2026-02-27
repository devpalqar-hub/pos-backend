import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddOvertimeDto {
    @ApiProperty({
        description: 'Date of overtime (ISO 8601 date)',
        example: '2026-02-20',
    })
    @IsNotEmpty({ message: 'Overtime date is required' })
    @Type(() => Date)
    date: Date;

    @ApiProperty({
        description: 'Number of overtime hours',
        example: 2.5,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01, { message: 'Overtime hours must be greater than 0' })
    @Type(() => Number)
    hours: number;

    @ApiProperty({
        description: 'Total wage amount for this overtime entry',
        example: 500.0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    wageAmount: number;

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
