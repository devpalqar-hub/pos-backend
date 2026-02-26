import { ExpenseType } from '@prisma/client';
export declare class UpdateExpenseDto {
    expenseName?: string;
    expenseType?: ExpenseType;
    amount?: number;
    description?: string;
    date?: Date;
}
