import { DayOfWeek } from '@prisma/client';
export declare class UpdateLoyalityPointDto {
    name?: string;
    points?: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    weekDays?: DayOfWeek[];
    categoryIds?: string[];
    menuItemIds?: string[];
    maxUsagePerCustomer?: number;
    isActive?: boolean;
}
