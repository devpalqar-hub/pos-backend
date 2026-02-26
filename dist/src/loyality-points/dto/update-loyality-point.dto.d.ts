import { DayOfWeek } from '@prisma/client';
export declare class UpdateLoyalityPointDto {
    name?: string;
    points?: number;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    maxUsagePerCustomer?: number;
    isGroup?: boolean;
    weekDays?: DayOfWeek[];
    categoryIds?: string[];
    menuItemIds?: string[];
    isActive?: boolean;
}
