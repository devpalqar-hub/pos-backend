import { UserRole } from '@prisma/client';
export declare class CreateUserDto {
    name: string;
    email: string;
    role: UserRole;
    restaurantId?: string;
}
