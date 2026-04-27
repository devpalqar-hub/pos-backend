import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBookingDto {
    @ApiProperty({
        required: false,
        description: 'Customer name',
    })
    @IsOptional()
    @IsString()
    customerName?: string;

    @ApiProperty({
        required: false,
        description: 'Customer phone number',
    })
    @IsOptional()
    @IsString()
    customerPhone?: string;

    @ApiProperty({
        required: false,
        description: 'Customer email',
    })
    @IsOptional()
    @IsString()
    customerEmail?: string;

    @ApiProperty({
        required: false,
        description: 'Delivery address',
    })
    @IsOptional()
    @IsString()
    deliveryAddress?: string;

    @ApiProperty({
        required: false,
        description: 'Special instructions for the order',
    })
    @IsOptional()
    @IsString()
    notes?: string;

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

    @ApiProperty({
        required: false,
        description: 'Stripe success redirect URL',
        example: 'https://example.com/payment/success',
    })
    @IsOptional()
    @IsUrl({ require_tld: false })
    successurl?: string;

    @ApiProperty({
        required: false,
        description: 'Stripe failure/cancel redirect URL',
        example: 'https://example.com/payment/failure',
    })
    @IsOptional()
    @IsUrl({ require_tld: false })
    failureurl?: string;

}