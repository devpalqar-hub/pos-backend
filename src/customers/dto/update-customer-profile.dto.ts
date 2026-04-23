import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCustomerProfileDto {
    @ApiPropertyOptional({
        description: 'Customer name',
        example: 'John Doe',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Customer phone number',
        example: '+1234567890',
        maxLength: 30,
    })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Customer email',
        example: 'user@example.com',
        maxLength: 255,
    })
    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    email?: string;

    @ApiPropertyOptional({
        description: 'Customer profile image URL',
        example: 'https://cdn.example.com/customers/john-doe.png',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    profileImage?: string;
}
