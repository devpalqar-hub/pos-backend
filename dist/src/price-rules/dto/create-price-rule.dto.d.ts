export declare enum PriceRuleType {
    RECURRING_WEEKLY = "RECURRING_WEEKLY",
    LIMITED_TIME = "LIMITED_TIME"
}
export declare enum DayOfWeek {
    MONDAY = "MONDAY",
    TUESDAY = "TUESDAY",
    WEDNESDAY = "WEDNESDAY",
    THURSDAY = "THURSDAY",
    FRIDAY = "FRIDAY",
    SATURDAY = "SATURDAY",
    SUNDAY = "SUNDAY"
}
export declare class CreatePriceRuleDto {
    name: string;
    ruleType: PriceRuleType;
    specialPrice: string;
    startTime?: string;
    endTime?: string;
    days?: DayOfWeek[];
    startDate?: string;
    endDate?: string;
    priority?: number;
    isActive?: boolean;
}
