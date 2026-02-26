import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { DayOfWeek } from '@prisma/client';

export class UpdateLoyalityPointDto {
    @ApiPropertyOptional({
        description: 'Name/label of the loyalty point rule',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Number of points awarded per qualifying purchase',
        example: 10,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    points?: number;

    @ApiPropertyOptional({
        description: 'Start date (ISO 8601)',
        example: '2026-03-01T00:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'End date (ISO 8601)',
        example: '2026-03-31T23:59:59.000Z',
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        description: 'Start time (24-hr HH:MM)',
        example: '09:00',
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    startTime?: string;

    @ApiPropertyOptional({
        description: 'End time (24-hr HH:MM)',
        example: '22:00',
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    endTime?: string;

    @ApiPropertyOptional({
        description: 'Days of week when this rule is active (replaces existing)',
        example: ['MONDAY', 'FRIDAY'],
        enum: DayOfWeek,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    weekDays?: DayOfWeek[];

    @ApiPropertyOptional({
        description: 'Category IDs (replaces existing)',
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categoryIds?: string[];

    @ApiPropertyOptional({
        description: 'Menu item IDs (replaces existing)',
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    menuItemIds?: string[];

    @ApiPropertyOptional({
        description:
            'Max number of times a single customer can redeem this rule. Null = unlimited.',
        example: 5,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxUsagePerCustomer?: number;

    @ApiPropertyOptional({
        description: 'Activate or deactivate the loyalty point rule',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
