import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
import { CouponDiscountType } from '@prisma/client'

/**
 * Fields that can be updated on a coupon via PATCH /restaurants/:id/coupons/:couponId
 * All fields are optional. Include `isActive: false` to disable a coupon.
 * Disabled coupons:
 *  - Are hidden from customer-facing listing and cannot be applied to orders
 *  - Are still visible to OWNER / RESTAURANT_ADMIN in the admin listing
 */
export class UpdateCouponDto {

    @ApiPropertyOptional({ example: 'SAVE10' })
    @IsOptional()
    @IsString()
    code?: string

    @ApiPropertyOptional({ example: '10% Discount' })
    @IsOptional()
    @IsString()
    name?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string

    @ApiPropertyOptional({ enum: CouponDiscountType })
    @IsOptional()
    @IsEnum(CouponDiscountType)
    discountType?: CouponDiscountType

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @IsNumber()
    discountValue?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    maxDiscount?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    minOrderAmount?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    usageLimit?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    perCustomerLimit?: number

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    validFrom?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    validUntil?: string

    @ApiPropertyOptional({
        example: false,
        description:
            'Set to false to disable the coupon. ' +
            'Disabled coupons cannot be applied by customers and are hidden from customer-facing listings. ' +
            'Admins (OWNER / RESTAURANT_ADMIN) can still see them.',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean
}