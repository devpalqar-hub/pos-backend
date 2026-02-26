import { LoyalityPointsService } from './loyality-points.service';
import { CreateLoyalityPointDto } from './dto/create-loyality-point.dto';
import { UpdateLoyalityPointDto } from './dto/update-loyality-point.dto';
import { User } from '@prisma/client';
export declare class LoyalityPointsController {
    private readonly loyalityPointsService;
    constructor(loyalityPointsService: LoyalityPointsService);
    create(actor: User, restaurantId: string, dto: CreateLoyalityPointDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string): Promise<{
        message: string;
        data: {
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
        };
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
        data: {
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
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateLoyalityPointDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
