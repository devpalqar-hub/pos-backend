import { UserRole } from '../../../generated/prisma';
export declare class CreateUserDto {
    name: string;
    email: string;
    role: UserRole;
    restaurantId?: string;
}
