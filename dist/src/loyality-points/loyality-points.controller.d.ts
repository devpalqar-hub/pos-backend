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
        };
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string, search?: string, status?: string, type?: string): Promise<{
        message: string;
        data: {
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
        };
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
        data: {
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
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateLoyalityPointDto): Promise<{
        message: string;
        data: {
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
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
