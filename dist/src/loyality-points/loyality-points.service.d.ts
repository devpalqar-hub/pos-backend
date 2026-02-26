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
    } & {
        id: string;
        name: string;
        isActive: boolean;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        day: import(".prisma/client").$Enums.DayOfWeek | null;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
        isGroup: boolean;
    }>;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            name: string;
            isActive: boolean;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            day: import(".prisma/client").$Enums.DayOfWeek | null;
            startTime: string | null;
            endTime: string | null;
            startDate: Date | null;
            endDate: Date | null;
            points: import("@prisma/client/runtime/library").Decimal;
            maxUsagePerCustomer: number | null;
            isGroup: boolean;
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
    } & {
        id: string;
        name: string;
        isActive: boolean;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        day: import(".prisma/client").$Enums.DayOfWeek | null;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
        isGroup: boolean;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateLoyalityPointDto): Promise<{
        restaurant: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        name: string;
        isActive: boolean;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        day: import(".prisma/client").$Enums.DayOfWeek | null;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        points: import("@prisma/client/runtime/library").Decimal;
        maxUsagePerCustomer: number | null;
        isGroup: boolean;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
