import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

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
    name?: string;

    @ApiProperty({
        example: '+919876543210',
    })
    @IsString()
    phone: string;
}