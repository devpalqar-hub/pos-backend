import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEmail,
    IsUrl,
    IsUUID,
    IsNumber,
    IsInt,
    IsBoolean,
    IsPositive,
    MaxLength,
    Min,
    Max,
    ValidateNested,
    IsArray,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum DayOfWeek {
    MONDAY = 'MONDAY',
    TUESDAY = 'TUESDAY',
    WEDNESDAY = 'WEDNESDAY',
    THURSDAY = 'THURSDAY',
    FRIDAY = 'FRIDAY',
    SATURDAY = 'SATURDAY',
    SUNDAY = 'SUNDAY',
}

export class WorkingHoursEntryDto {
    @ApiProperty({
        description: 'Day of the week',
        enum: DayOfWeek,
        example: DayOfWeek.MONDAY,
    })
    @IsEnum(DayOfWeek)
    day: DayOfWeek;

    @ApiPropertyOptional({
        description: 'Opening time in 24-hr HH:MM format',
        example: '09:00',
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    openTime?: string;

    @ApiPropertyOptional({
        description: 'Closing time in 24-hr HH:MM format',
        example: '22:00',
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    closeTime?: string;

    @ApiPropertyOptional({
        description: 'Mark this day as closed (overrides openTime/closeTime)',
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isClosed?: boolean;
}

export class CreateRestaurantDto {
    // ─── Core ───────────────────────────────────────────────────────────────────

    @ApiProperty({
        description: 'Restaurant display name',
        example: 'The Golden Fork',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Restaurant name is required' })
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({
        description:
            'URL-friendly slug (auto-generated from name if not provided). Must be unique.',
        example: 'the-golden-fork',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    slug?: string;

    @ApiPropertyOptional({
        description: 'Short description of the restaurant',
        example: 'Fine dining with a modern twist.',
    })
    @IsOptional()
    @IsString()
    description?: string;

    // ─── Assign to Owner ────────────────────────────────────────────────────────

    @ApiProperty({
        description: 'UUID of the OWNER user to assign this restaurant to',
        example: 'owner-uuid',
    })
    @IsUUID('4', { message: 'ownerId must be a valid UUID' })
    @IsNotEmpty({ message: 'ownerId is required' })
    ownerId: string;

    // ─── Contact ────────────────────────────────────────────────────────────────

    @ApiPropertyOptional({ description: 'Phone number', example: '+1-800-555-0199' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;

    @ApiPropertyOptional({ description: 'Contact email', example: 'info@goldenfork.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Website URL', example: 'https://goldenfork.com' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    website?: string;

    // ─── Location ───────────────────────────────────────────────────────────────

    @ApiPropertyOptional({ description: 'Street address', example: '123 Main St' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiPropertyOptional({ description: 'City', example: 'New York' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @ApiPropertyOptional({ description: 'State / Province', example: 'NY' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @ApiPropertyOptional({ description: 'Country', example: 'USA' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @ApiPropertyOptional({ description: 'Postal / ZIP code', example: '10001' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @ApiPropertyOptional({ description: 'GPS latitude', example: 40.7128 })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({ description: 'GPS longitude', example: -74.006 })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    // ─── Branding ───────────────────────────────────────────────────────────────

    @ApiPropertyOptional({ description: 'Logo image URL', example: 'https://cdn.example.com/logo.png' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    logoUrl?: string;

    @ApiPropertyOptional({ description: 'Cover / banner image URL', example: 'https://cdn.example.com/cover.jpg' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    coverUrl?: string;

    // ─── Business Details ────────────────────────────────────────────────────────

    @ApiPropertyOptional({
        description: 'Type of cuisine served',
        example: 'Italian, French Fusion',
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    cuisineType?: string;

    @ApiPropertyOptional({ description: 'Maximum seating capacity', example: 120 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    maxCapacity?: number;

    @ApiPropertyOptional({
        description: 'Tax rate percentage (e.g. 8.5 for 8.5%)',
        example: 8.5,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    taxRate?: number;

    @ApiPropertyOptional({
        description: 'Currency code (ISO 4217)',
        example: 'USD',
        default: 'USD',
    })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    currency?: string;

    // ─── Working Hours ───────────────────────────────────────────────────────────

    @ApiPropertyOptional({
        description:
            'Weekly working hours schedule. Provide entries for each day you want to configure. ' +
            'Omitted days will have no schedule set.',
        type: [WorkingHoursEntryDto],
        example: [
            { day: 'MONDAY', openTime: '09:00', closeTime: '22:00', isClosed: false },
            { day: 'SUNDAY', isClosed: true },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkingHoursEntryDto)
    workingHours?: WorkingHoursEntryDto[];
}
