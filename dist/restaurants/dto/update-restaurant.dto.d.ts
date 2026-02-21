import { WorkingHoursEntryDto } from './create-restaurant.dto';
export declare class UpdateRestaurantDto {
    name?: string;
    slug?: string;
    description?: string;
    ownerId?: string;
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
    isActive?: boolean;
    workingHours?: WorkingHoursEntryDto[];
}
