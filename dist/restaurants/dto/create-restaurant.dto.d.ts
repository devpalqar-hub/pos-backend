export declare enum DayOfWeek {
    MONDAY = "MONDAY",
    TUESDAY = "TUESDAY",
    WEDNESDAY = "WEDNESDAY",
    THURSDAY = "THURSDAY",
    FRIDAY = "FRIDAY",
    SATURDAY = "SATURDAY",
    SUNDAY = "SUNDAY"
}
export declare class WorkingHoursEntryDto {
    day: DayOfWeek;
    openTime?: string;
    closeTime?: string;
    isClosed?: boolean;
}
export declare class CreateRestaurantDto {
    name: string;
    slug?: string;
    description?: string;
    ownerId: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    logoUrl?: string;
    coverUrl?: string;
    cuisineType?: string;
    maxCapacity?: number;
    taxRate?: number;
    currency?: string;
    workingHours?: WorkingHoursEntryDto[];
}
