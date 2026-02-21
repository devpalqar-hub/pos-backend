import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEmail,
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
import { WorkingHoursEntryDto } from './create-restaurant.dto';

export class UpdateRestaurantDto {
    @ApiPropertyOptional({ description: 'Restaurant display name', maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({ description: 'URL-friendly slug (must be unique)', maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    slug?: string;

    @ApiPropertyOptional({ description: 'Short description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description:
            'Transfer ownership to another OWNER user (SUPER_ADMIN only)',
        example: 'new-owner-uuid',
    })
    @IsOptional()
    @IsUUID('4')
    ownerId?: string;

    @ApiPropertyOptional({ description: 'Phone number', maxLength: 30 })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;

    @ApiPropertyOptional({ description: 'Contact email' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Website URL', maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    website?: string;

    @ApiPropertyOptional({ description: 'Street address', maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiPropertyOptional({ description: 'City', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @ApiPropertyOptional({ description: 'State / Province', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @ApiPropertyOptional({ description: 'Country', maxLength: 100 })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @ApiPropertyOptional({ description: 'Postal / ZIP code', maxLength: 20 })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @ApiPropertyOptional({ description: 'GPS latitude', minimum: -90, maximum: 90 })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({ description: 'GPS longitude', minimum: -180, maximum: 180 })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({ description: 'Logo image URL', maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    logoUrl?: string;

    @ApiPropertyOptional({ description: 'Cover / banner image URL', maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    coverUrl?: string;

    @ApiPropertyOptional({ description: 'Type of cuisine served', maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    cuisineType?: string;

    @ApiPropertyOptional({ description: 'Maximum seating capacity' })
    @IsOptional()
    @IsInt()
    @IsPositive()
    maxCapacity?: number;

    @ApiPropertyOptional({ description: 'Tax rate percentage (0–100)' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    taxRate?: number;

    @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', maxLength: 10 })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    currency?: string;

    @ApiPropertyOptional({
        description: 'Activate or deactivate the restaurant (SUPER_ADMIN / OWNER only)',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description:
            'Update working hours schedule. Providing this array will upsert all supplied days, ' +
            'leaving unmentioned days unchanged.',
        type: [WorkingHoursEntryDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => WorkingHoursEntryDto)
    workingHours?: WorkingHoursEntryDto[];
}
