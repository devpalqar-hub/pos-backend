import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseType } from '@prisma/client';

export class UpdateExpenseDto {
    @ApiPropertyOptional({
        description: 'Name of the expense',
        example: 'Water Bill',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    expenseName?: string;

    @ApiPropertyOptional({
        description: 'Type of expense',
        enum: ExpenseType,
        example: ExpenseType.MONTHLY,
    })
    @IsOptional()
    @IsEnum(ExpenseType, { message: 'expenseType must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' })
    expenseType?: ExpenseType;

    @ApiPropertyOptional({
        description: 'Expense amount',
        example: 2000.0,
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    amount?: number;

    @ApiPropertyOptional({
        description: 'Description or notes about the expense',
        example: 'Updated electricity bill',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({
        description: 'Date of the expense',
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
}
