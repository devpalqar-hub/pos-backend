import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExpenseType } from '@prisma/client';

export class CreateExpenseDto {
    @ApiProperty({
        description: 'Name of the expense',
        example: 'Electricity Bill',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Expense name is required' })
    @MaxLength(255)
    expenseName: string;

    @ApiProperty({
        description: 'Type of expense',
        enum: ExpenseType,
        example: ExpenseType.MONTHLY,
    })
    @IsEnum(ExpenseType, { message: 'expenseType must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' })
    expenseType: ExpenseType;

    @ApiProperty({
        description: 'Expense amount',
        example: 1500.0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Type(() => Number)
    amount: number;

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
}
