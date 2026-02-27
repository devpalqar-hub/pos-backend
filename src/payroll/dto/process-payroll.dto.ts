import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessPayrollDto {
    @ApiProperty({
        description: 'Month to process (1–12)',
        example: 2,
    })
    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    month: number;

    @ApiProperty({
        description: 'Year to process',
        example: 2026,
    })
    @IsInt()
    @Min(2000)
    @Type(() => Number)
    year: number;

    @ApiPropertyOptional({
        description: 'Bonus amount to add',
        example: 2000.0,
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    bonusAmount?: number;

    @ApiPropertyOptional({
        description: 'Deduction amount (advances, penalties, etc.)',
        example: 500.0,
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    deductionAmount?: number;

    @ApiPropertyOptional({
        description: 'Notes about the deduction',
        example: 'Advance salary deduction',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    deductionNotes?: string;

    @ApiPropertyOptional({
        description: 'General payroll notes',
        example: 'February 2026 salary',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}
