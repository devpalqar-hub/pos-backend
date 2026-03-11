import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsString } from 'class-validator'

export class ValidateCouponDto {

    @ApiProperty()
    @IsString()
    couponCode: string

    @ApiProperty()
    @IsNumber()
    orderAmount: number
}