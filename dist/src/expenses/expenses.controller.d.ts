import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User, ExpenseType } from '@prisma/client';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(actor: User, restaurantId: string, dto: CreateExpenseDto): Promise<{
        message: string;
        data: {
            id: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            expenseName: string;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            createdById: string | null;
            expenseCategoryId: string | null;
        };
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string, expenseType?: ExpenseType, search?: string, startDate?: string, endDate?: string): Promise<{
        message: string;
        data: {
            data: {
                id: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                restaurantId: string;
                expenseName: string;
                expenseType: import(".prisma/client").$Enums.ExpenseType;
                amount: import("@prisma/client/runtime/library").Decimal;
                date: Date;
                createdById: string | null;
                expenseCategoryId: string | null;
            }[];
            meta: {
                total: number;
                page: number;
                limit: number;
                totalPages: number;
                hasNextPage: boolean;
                hasPrevPage: boolean;
            };
        };
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
        data: {
            expenseCategory: {
                id: string;
                name: string;
                description: string | null;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            } | null;
        } & {
            id: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            expenseName: string;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            createdById: string | null;
            expenseCategoryId: string | null;
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateExpenseDto): Promise<{
        message: string;
        data: {
            id: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            expenseName: string;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            createdById: string | null;
            expenseCategoryId: string | null;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
