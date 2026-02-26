import { PriceRulesService } from './price-rules.service';
import { User } from '@prisma/client';
export declare class RestaurantPriceRulesController {
    private readonly priceRulesService;
    constructor(priceRulesService: PriceRulesService);
    getAllByRestaurantId(actor: User, restaurantId: string, page?: string, limit?: string, ruleType?: string, isActive?: string): Promise<{
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
}
