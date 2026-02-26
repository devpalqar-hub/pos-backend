import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyalityPointDto } from './dto/create-loyality-point.dto';
import { UpdateLoyalityPointDto } from './dto/update-loyality-point.dto';
import { User } from '@prisma/client';
export declare class LoyalityPointsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly defaultInclude;
    create(actor: User, restaurantId: string, dto: CreateLoyalityPointDto): Promise<{
        restaurant: {
            id: string;
            name: string;
        };
        categories: {
            id: string;
            name: string;
        }[];
        menuItems: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        }[];
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        id: string;
        isGroup: boolean;
        name: string;
        points: import("@prisma/client/runtime/library").Decimal;
        startDate: Date | null;
        endDate: Date | null;
        startTime: string | null;
        endTime: string | null;
        maxUsagePerCustomer: number | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    private resolveType;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number, search?: string, status?: string, type?: string): Promise<{
        data: {
            id: string;
            isGroup: boolean;
            name: string;
            points: import("@prisma/client/runtime/library").Decimal;
            startDate: Date | null;
            endDate: Date | null;
            startTime: string | null;
            endTime: string | null;
            maxUsagePerCustomer: number | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
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
        restaurant: {
            id: string;
            name: string;
        };
        categories: {
            id: string;
            name: string;
        }[];
        menuItems: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        }[];
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        id: string;
        isGroup: boolean;
        name: string;
        points: import("@prisma/client/runtime/library").Decimal;
        startDate: Date | null;
        endDate: Date | null;
        startTime: string | null;
        endTime: string | null;
        maxUsagePerCustomer: number | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateLoyalityPointDto): Promise<{
        restaurant: {
            id: string;
            name: string;
        };
        categories: {
            id: string;
            name: string;
        }[];
        menuItems: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        }[];
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        id: string;
        isGroup: boolean;
        name: string;
        points: import("@prisma/client/runtime/library").Decimal;
        startDate: Date | null;
        endDate: Date | null;
        startTime: string | null;
        endTime: string | null;
        maxUsagePerCustomer: number | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
