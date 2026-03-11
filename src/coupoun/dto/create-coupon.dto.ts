import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CouponDiscountType } from '@prisma/client'
import { IsEnum, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator'

export class CreateCouponDto {

    @ApiProperty({ example: "SAVE10" })
    @IsString()
    code: string

    @ApiProperty({ example: "10% Discount" })
    @IsString()
    name: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string

    @ApiProperty({ enum: CouponDiscountType })
    @IsEnum(CouponDiscountType)
    discountType: CouponDiscountType

    @ApiProperty({ example: 10 })
    @IsNumber()
    discountValue: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    maxDiscount?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    minOrderAmount?: number

    @ApiProperty()
    @IsDateString()
    validFrom: string

    @ApiProperty()
    @IsDateString()
    validUntil: string
}