import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User, ExpenseType } from '@prisma/client';
export declare class ExpensesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(actor: User, restaurantId: string, dto: CreateExpenseDto): Promise<{
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        expenseName: string;
        expenseType: import(".prisma/client").$Enums.ExpenseType;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
    }>;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number, expenseType?: ExpenseType, search?: string, startDate?: Date, endDate?: Date): Promise<{
        data: {
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            expenseName: string;
            expenseType: import(".prisma/client").$Enums.ExpenseType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
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
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        expenseName: string;
        expenseType: import(".prisma/client").$Enums.ExpenseType;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateExpenseDto): Promise<{
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        expenseName: string;
        expenseType: import(".prisma/client").$Enums.ExpenseType;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
