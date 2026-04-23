import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterCustomerDto {
    @ApiProperty({
        example: 'user@example.com',
        description: 'Customer email',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'John Doe',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiProperty({
        example: '+919876543210',
    })
    @IsString()
    phone: string;

    @ApiProperty({
        example: 'https://cdn.example.com/customers/john-doe.png',
        required: false,
        description: 'Customer profile image URL',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    profileImage?: string;
}