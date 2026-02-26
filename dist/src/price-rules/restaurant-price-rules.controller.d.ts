import { PriceRulesService } from './price-rules.service';
import { User } from '@prisma/client';
export declare class RestaurantPriceRulesController {
    private readonly priceRulesService;
    constructor(priceRulesService: PriceRulesService);
    getAllByRestaurantId(actor: User, restaurantId: string, page?: string, limit?: string, ruleType?: string, isActive?: string, menuItemId?: string): Promise<{
        data: {
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
}
