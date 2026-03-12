import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SendOtpDto {
    @ApiProperty({
        example: 'customer@email.com',
        description: 'Customer email address',
    })
    @IsEmail()
    email: string;
}