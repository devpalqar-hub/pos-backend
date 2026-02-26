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
        name: string;
        isActive: boolean;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        isGroup: boolean;
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
    }>;
    private resolveType;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number, search?: string, status?: string, type?: string): Promise<{
        data: {
            id: string;
            name: string;
            isActive: boolean;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            startTime: string | null;
            endTime: string | null;
            startDate: Date | null;
            endDate: Date | null;
            isGroup: boolean;
            points: import("@prisma/client/runtime/library").Decimal;
            maxUsagePerCustomer: number | null;
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
        name: string;
        isActive: boolean;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        isGroup: boolean;
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
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
        name: string;
        isActive: boolean;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        isGroup: boolean;
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
