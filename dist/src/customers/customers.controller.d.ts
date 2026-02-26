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
            id: string;
            name: string | null;
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
                id: string;
                name: string | null;
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
            loyalityPointRedemptions: ({
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
            name: string | null;
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
            loyalityPointRedemptions: ({
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
            name: string | null;
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
            id: string;
            name: string | null;
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
