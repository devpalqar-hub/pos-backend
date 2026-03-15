import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
    @ApiProperty({
        description: 'Cart UUID used to create the booking',
    })
    @IsUUID()
    cartId: string;

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

}