import { UserRole } from '@prisma/client';
export declare class UpdateUserDto {
    name?: string;
    email?: string;
    role?: UserRole;
    restaurantId?: string;
    isActive?: boolean;
}
export declare class UpdateProfileDto {
    name?: string;
}
