import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { User } from '@prisma/client';
export declare class CustomersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(actor: User, restaurantId: string, dto: CreateCustomerDto): Promise<{
        id: string;
        phone: string;
        name: string | null;
        wallet: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: string;
            phone: string;
            name: string | null;
            wallet: import("@prisma/client/runtime/library").Decimal;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
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
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        LoyalityPointRedemption: ({
            loyalityPoint: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            redeemedAt: Date;
            loyalityPointId: string;
            customerId: string;
            pointsAwarded: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        phone: string;
        name: string | null;
        wallet: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    findByPhone(actor: User, restaurantId: string, phone: string): Promise<{
        LoyalityPointRedemption: ({
            loyalityPoint: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            redeemedAt: Date;
            loyalityPointId: string;
            customerId: string;
            pointsAwarded: import("@prisma/client/runtime/library").Decimal;
        })[];
    } & {
        id: string;
        phone: string;
        name: string | null;
        wallet: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateCustomerDto): Promise<{
        id: string;
        phone: string;
        name: string | null;
        wallet: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
