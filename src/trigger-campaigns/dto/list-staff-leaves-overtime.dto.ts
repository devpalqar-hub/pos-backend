import { IsInt, IsNotEmpty, IsOptional, IsArray, IsString, ArrayNotEmpty, ArrayUnique, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListStaffLeavesOvertimeDto {
    @ApiProperty({ description: 'Month (1-12)', minimum: 1, maximum: 12 })
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @ApiProperty({ description: 'Year (e.g. 2026)' })
    @IsInt()
    year: number;

    @ApiPropertyOptional({ description: 'List of staff IDs to filter', type: [String] })
    @IsOptional()
    @IsArray()
    @ArrayNotEmpty()
    @ArrayUnique()
    @IsString({ each: true })
    staffIds?: string[];
}
