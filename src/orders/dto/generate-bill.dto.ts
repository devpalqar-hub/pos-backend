import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDecimal, IsEmail, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class GenerateBillDto {
    @ApiPropertyOptional({
        description: 'Discount amount to apply on the subtotal',
        example: '50.00',
    })
    @IsOptional()
    @IsDecimal({ decimal_digits: '0,2' })
    discountAmount?: string;

    @ApiPropertyOptional({ example: 'Staff discount applied' })
    @IsOptional()
    @IsString()
    notes?: string;

    // ── Walk-in customer info (optional) ──────────────────────────────────────
    @ApiPropertyOptional({ example: 'John Doe' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    customerName?: string;

    @ApiPropertyOptional({ example: '+91 9876543210' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    customerPhone?: string;

    @ApiPropertyOptional({ example: 'john@example.com' })
    @IsOptional()
    @IsEmail()
    customerEmail?: string;

    @ApiPropertyOptional({ example: 2, default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    guestCount?: number;


    @ApiProperty({
        required: false,
        description: 'Apply loyalty points during booking',
    })
    @IsOptional()
    @IsBoolean()
    claimedLoyalityPoints?: boolean;

    @ApiProperty({
        required: false,
        description: 'Coupon code applied by the user',
    })
    @IsOptional()
    @IsString()
    couponName?: string;

}
