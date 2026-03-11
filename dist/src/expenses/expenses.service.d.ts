import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User, ExpenseType } from '@prisma/client';
export declare class ExpensesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(actor: User, restaurantId: string, dto: CreateExpenseDto): Promise<{
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
    }>;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number, expenseType?: ExpenseType, search?: string, startDate?: Date, endDate?: Date): Promise<{
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
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
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
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateExpenseDto): Promise<{
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
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
