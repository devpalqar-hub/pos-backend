import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client'

export class CreateUserDto {
    @ApiProperty({
        description: 'Full name of the user',
        example: 'Jane Smith',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Unique email address of the user',
        example: 'jane@restaurant.com',
    })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @ApiProperty({
        description: 'Role to assign to the user',
        enum: UserRole,
        example: UserRole.WAITER,
    })
    @IsEnum(UserRole, { message: `Role must be one of: ${Object.values(UserRole).join(', ')}` })
    @IsNotEmpty({ message: 'Role is required' })
    role: UserRole;

    @ApiPropertyOptional({
        description:
            'Restaurant ID to assign the user to. ' +
            'Required for RESTAURANT_ADMIN, WAITER, CHEF, BILLER roles.',
        example: 'uuid-of-restaurant',
    })
    @IsOptional()
    @IsUUID('4', { message: 'restaurantId must be a valid UUID' })
    restaurantId?: string;
}
