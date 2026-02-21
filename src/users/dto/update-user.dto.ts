import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma';

export class UpdateUserDto {
    @ApiPropertyOptional({
        description: 'Full name of the user',
        example: 'Jane Smith Updated',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Email address of the user',
        example: 'jane.updated@restaurant.com',
    })
    @IsOptional()
    @IsEmail({}, { message: 'Please provide a valid email address' })
    email?: string;

    @ApiPropertyOptional({
        description: 'Role to assign to the user (Super Admin only)',
        enum: UserRole,
    })
    @IsOptional()
    @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
    role?: UserRole;

    @ApiPropertyOptional({
        description: 'Restaurant ID to reassign the user',
    })
    @IsOptional()
    @IsUUID('4', { message: 'restaurantId must be a valid UUID' })
    restaurantId?: string;

    @ApiPropertyOptional({
        description: 'Activate or deactivate the account (Super Admin / Owner only)',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

// ── Profile update DTO (restricted to name only for staff) ──────────────────

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'Your full name',
        example: 'Jane Smith',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;
}
