import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
    @ApiProperty({
        example: 'customer@email.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: '482193',
        description: 'OTP sent to email',
    })
    @IsString()
    @Length(4, 10)
    otp: string;
}