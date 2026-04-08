import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseType, PaymentMethod, VendorPaymentType } from '@prisma/client';

export class CreateExpenseVendorPaymentDto {
    @ApiProperty({
        description: 'Vendor UUID',
        example: '5e57e31b-45fc-4f08-9013-86ebe696c2fa',
    })
    @IsUUID()
    vendorId!: string;

    @ApiProperty({
        description: 'Amount paid in this payment entry',
        example: 300,
    })
    @IsNumber()
    @Min(0.01)
    @Type(() => Number)
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
}

export class CreateExpenseDto {
    @ApiProperty({
        description: 'Name of the expense',
        example: 'Electricity Bill',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Expense name is required' })
    @MaxLength(255)
    expenseName!: string;

    @ApiProperty({
        description: 'Type of expense',
        enum: ExpenseType,
        example: ExpenseType.MONTHLY,
    })
    @IsEnum(ExpenseType, { message: 'expenseType must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' })
    expenseType!: ExpenseType;

    @ApiProperty({
        description: 'Expense amount',
        example: 1500.0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    amount!: number;

    @ApiPropertyOptional({
        description: 'Description or notes about the expense',
        example: 'Monthly electricity bill for January',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Date of the expense (defaults to now)',
        example: '2026-02-26T00:00:00.000Z',
    })
    @IsOptional()
    @Type(() => Date)
    date?: Date;

    @ApiPropertyOptional({
        description: 'Expense category ID',
        example: 'f4f0c9d0-9c7c-4c6e-8a7b-8b0e6f1d7f3a',
    })
    @IsOptional()
    @IsUUID()
    expenseCategoryId?: string;

    @ApiPropertyOptional({
        description:
            'Optional vendor payment details to create one vendor payment along with this expense.',
        type: CreateExpenseVendorPaymentDto,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateExpenseVendorPaymentDto)
    vendorPayment?: CreateExpenseVendorPaymentDto;
}
