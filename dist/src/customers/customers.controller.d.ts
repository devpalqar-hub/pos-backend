import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { User } from '@prisma/client';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    create(actor: User, restaurantId: string, dto: CreateCustomerDto): Promise<{
        message: string;
        data: {
            name: string | null;
            id: string;
            email: string | null;
            isActive: boolean;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            wallet: import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string, search?: string): Promise<{
        message: string;
        data: {
            data: {
                name: string | null;
                id: string;
                email: string | null;
                isActive: boolean;
                restaurantId: string;
                createdAt: Date;
                updatedAt: Date;
                phone: string;
                wallet: import("@prisma/client/runtime/library").Decimal;
            }[];
            meta: {
                total: number;
                page: number;
                limit: number;
                totalPages: number;
                hasNextPage: boolean;
                hasPrevPage: boolean;
            };
        };
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
        data: {
            LoyalityPointRedemption: ({
                loyalityPoint: {
                    name: string;
                    id: string;
                };
            } & {
                id: string;
                customerId: string;
                loyalityPointId: string;
                redeemedAt: Date;
                pointsAwarded: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            name: string | null;
            id: string;
            email: string | null;
            isActive: boolean;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            wallet: import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    findByPhone(actor: User, restaurantId: string, phone: string): Promise<{
        message: string;
        data: {
            LoyalityPointRedemption: ({
                loyalityPoint: {
                    name: string;
                    id: string;
                };
            } & {
                id: string;
                customerId: string;
                loyalityPointId: string;
                redeemedAt: Date;
                pointsAwarded: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            name: string | null;
            id: string;
            email: string | null;
            isActive: boolean;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            wallet: import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateCustomerDto): Promise<{
        message: string;
        data: {
            name: string | null;
            id: string;
            email: string | null;
            isActive: boolean;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            phone: string;
            wallet: import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
