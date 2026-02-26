import { ExpenseType } from '@prisma/client';
export declare class CreateExpenseDto {
    expenseName: string;
    expenseType: ExpenseType;
    amount: number;
    description?: string;
    date?: Date;
}
