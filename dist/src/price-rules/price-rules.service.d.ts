import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceRuleDto, PriceRuleType } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { User } from '@prisma/client';
export declare class PriceRulesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getManageableRestaurantIds;
    private assertAccess;
    private assertRestaurantExists;
    private assertMenuItemExists;
    private validateDto;
    create(actor: User, restaurantId: string, menuItemId: string, dto: CreatePriceRuleDto): Promise<{
        restaurant: {
            id: string;
            name: string;
        };
        menuItem: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        id: string;
        name: string;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: number;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        menuItemId: string;
    }>;
    findAllByMenuItem(actor: User, restaurantId: string, menuItemId: string, page?: number, limit?: number, ruleType?: PriceRuleType, isActive?: boolean): Promise<{
        data: {
            id: string;
            name: string;
            ruleType: import(".prisma/client").$Enums.PriceRuleType;
            specialPrice: import("@prisma/client/runtime/library").Decimal;
            startTime: string | null;
            endTime: string | null;
            startDate: Date | null;
            endDate: Date | null;
            priority: number;
            isActive: boolean;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            menuItemId: string;
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
    findAllByRestaurant(actor: User, restaurantId: string, page?: number, limit?: number, ruleType?: PriceRuleType, isActive?: boolean): Promise<{
        data: {
            id: string;
            name: string;
            ruleType: import(".prisma/client").$Enums.PriceRuleType;
            specialPrice: import("@prisma/client/runtime/library").Decimal;
            startTime: string | null;
            endTime: string | null;
            startDate: Date | null;
            endDate: Date | null;
            priority: number;
            isActive: boolean;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            menuItemId: string;
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
    findOne(actor: User, restaurantId: string, menuItemId: string, id: string): Promise<{
        restaurant: {
            id: string;
            name: string;
        };
        menuItem: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        id: string;
        name: string;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: number;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        menuItemId: string;
    }>;
    update(actor: User, restaurantId: string, menuItemId: string, id: string, dto: UpdatePriceRuleDto): Promise<{
        restaurant: {
            id: string;
            name: string;
        };
        menuItem: {
            id: string;
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        id: string;
        name: string;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: number;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        menuItemId: string;
    }>;
    remove(actor: User, restaurantId: string, menuItemId: string, id: string): Promise<{
        id: string;
    }>;
    getEffectivePrice(actor: User, restaurantId: string, menuItemId: string, atTime?: Date): Promise<{
        menuItemId: string;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        effectivePrice: import("@prisma/client/runtime/library").Decimal;
        appliedRule: null;
    } | {
        menuItemId: string;
        basePrice: import("@prisma/client/runtime/library").Decimal;
        effectivePrice: import("@prisma/client/runtime/library").Decimal;
        appliedRule: {
            id: string;
            name: string;
            ruleType: import(".prisma/client").$Enums.PriceRuleType;
            priority: number;
        };
    }>;
}
