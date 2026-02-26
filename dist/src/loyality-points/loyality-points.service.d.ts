import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyalityPointDto } from './dto/create-loyality-point.dto';
import { UpdateLoyalityPointDto } from './dto/update-loyality-point.dto';
import { User } from '@prisma/client';
export declare class LoyalityPointsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private readonly defaultInclude;
    create(actor: User, restaurantId: string, dto: CreateLoyalityPointDto): Promise<{
        categories: {
            id: string;
            category: {
                id: string;
                name: string;
            };
        }[];
        menuItems: {
            id: string;
            menuItem: {
                id: string;
                name: string;
            };
        }[];
        weekDays: {
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
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
    }>;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number): Promise<{
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
        categories: {
            id: string;
            category: {
                id: string;
                name: string;
            };
        }[];
        menuItems: {
            id: string;
            menuItem: {
                id: string;
                name: string;
            };
        }[];
        weekDays: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
        redemptions: ({
            customer: {
                id: string;
                name: string | null;
                phone: string;
            };
        } & {
            id: string;
            redeemedAt: Date;
            loyalityPointId: string;
            customerId: string;
            pointsAwarded: import("@prisma/client/runtime/library").Decimal;
        })[];
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
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateLoyalityPointDto): Promise<{
        categories: {
            id: string;
            category: {
                id: string;
                name: string;
            };
        }[];
        menuItems: {
            id: string;
            menuItem: {
                id: string;
                name: string;
            };
        }[];
        weekDays: {
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
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
