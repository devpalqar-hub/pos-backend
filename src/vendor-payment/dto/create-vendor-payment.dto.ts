import {
    IsUUID,
    IsOptional,
    IsNumber,
    IsEnum,
    IsString,
    Min,
} from 'class-validator';
import { VendorPaymentType, PaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorPaymentDto {
    @ApiProperty({
        description: 'Vendor UUID',
        example: '5e57e31b-45fc-4f08-9013-86ebe696c2fa',
    })
    @IsUUID()
    vendorId!: string;

    @ApiProperty({
        description: 'Restaurant UUID',
        example: 'c5f50dda-222a-445b-a41d-4f1a31914cf9',
    })
    @IsUUID()
    restaurantId!: string;

    @ApiProperty({
        description: 'Amount paid in this payment entry',
        example: 300,
    })
    @IsNumber()
    @Min(0.01)
    paidAmount!: number;

    @ApiPropertyOptional({
        enum: VendorPaymentType,
        description: 'Payment entry type',
    })
    @IsOptional()
    @IsEnum(VendorPaymentType)
    type?: VendorPaymentType;

    @ApiPropertyOptional({
        enum: PaymentMethod,
        description: 'Payment mode used for this entry',
    })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiPropertyOptional({
        description: 'Reference/transaction number',
        example: 'UPI-REF-248992',
    })
    @IsOptional()
    @IsString()
    referenceNo?: string;

    @ApiPropertyOptional({
        description: 'Optional note for this payment',
        example: 'March vegetables invoice settlement',
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({
        description: 'Expense UUID this vendor payment belongs to',
        example: '3c0d38f0-a78a-43e0-9ef3-a7f7371ea1e8',
    })
    @IsUUID()
    expenseId!: string;
}