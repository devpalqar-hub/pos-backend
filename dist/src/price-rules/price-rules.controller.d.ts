import { PriceRulesService } from './price-rules.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { User } from '@prisma/client';
export declare class PriceRulesController {
    private readonly priceRulesService;
    constructor(priceRulesService: PriceRulesService);
    create(actor: User, restaurantId: string, menuItemId: string, dto: CreatePriceRuleDto): Promise<{
        restaurant: {
            name: string;
            id: string;
        };
        menuItem: {
            name: string;
            id: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        name: string;
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: number;
        menuItemId: string;
    }>;
    findAll(actor: User, restaurantId: string, menuItemId: string, page?: string, limit?: string, ruleType?: string, isActive?: string): Promise<{
        data: {
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            ruleType: import(".prisma/client").$Enums.PriceRuleType;
            specialPrice: import("@prisma/client/runtime/library").Decimal;
            startTime: string | null;
            endTime: string | null;
            startDate: Date | null;
            endDate: Date | null;
            priority: number;
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
    getEffectivePrice(actor: User, restaurantId: string, menuItemId: string, atTime?: string): Promise<{
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
    findOne(actor: User, restaurantId: string, menuItemId: string, id: string): Promise<{
        restaurant: {
            name: string;
            id: string;
        };
        menuItem: {
            name: string;
            id: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        name: string;
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: number;
        menuItemId: string;
    }>;
    update(actor: User, restaurantId: string, menuItemId: string, id: string, dto: UpdatePriceRuleDto): Promise<{
        restaurant: {
            name: string;
            id: string;
        };
        menuItem: {
            name: string;
            id: string;
            price: import("@prisma/client/runtime/library").Decimal;
        };
        days: {
            id: string;
            day: import(".prisma/client").$Enums.DayOfWeek;
        }[];
    } & {
        name: string;
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        priority: number;
        menuItemId: string;
    }>;
    remove(actor: User, restaurantId: string, menuItemId: string, id: string): Promise<{
        id: string;
    }>;
}
