import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateLoyalityPointDto {
    @ApiProperty({
        description: 'Name/label of the loyalty point rule',
        example: 'Weekend Brunch Bonus',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({
        description: 'Number of points awarded per qualifying purchase',
        example: 10,
        default: 0,
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
        description:
            'Max number of times a single customer can redeem this loyalty point rule. Null = unlimited.',
        example: 5,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxUsagePerCustomer?: number;

    @ApiPropertyOptional({
        description: 'Whether this rule applies to a group of items/categories',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isGroup?: boolean;

    @ApiPropertyOptional({
        description: 'Days of the week when this rule is active',
        example: ['MONDAY', 'FRIDAY'],
        enum: DayOfWeek,
        isArray: true,
    })
    @IsOptional()
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    weekDays?: DayOfWeek[];

    @ApiPropertyOptional({
        description: 'Category UUIDs this rule applies to',
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    categoryIds?: string[];

    @ApiPropertyOptional({
        description: 'Menu item UUIDs this rule applies to',
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    menuItemIds?: string[];
}
