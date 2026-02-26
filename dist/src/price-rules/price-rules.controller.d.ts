import { PriceRulesService } from './price-rules.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { User } from '@prisma/client';
export declare class PriceRulesController {
    private readonly priceRulesService;
    constructor(priceRulesService: PriceRulesService);
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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        priority: number;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        menuItemId: string;
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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        priority: number;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        priority: number;
        ruleType: import(".prisma/client").$Enums.PriceRuleType;
        specialPrice: import("@prisma/client/runtime/library").Decimal;
        startTime: string | null;
        endTime: string | null;
        startDate: Date | null;
        endDate: Date | null;
        menuItemId: string;
    }>;
    remove(actor: User, restaurantId: string, menuItemId: string, id: string): Promise<{
        id: string;
    }>;
}
