import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User } from '@prisma/client';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    create(actor: User, restaurantId: string, dto: CreateCategoryDto): Promise<{
        message: string;
        data: {
            _count: {
                items: number;
            };
        } & {
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
        };
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string, search?: string): Promise<{
        message: string;
        data: {
            data: {
                id: string;
                name: string;
                isActive: boolean;
                createdById: string | null;
                restaurantId: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                imageUrl: string | null;
                sortOrder: number;
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
            items: {
                id: string;
                name: string;
                imageUrl: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
                itemType: import(".prisma/client").$Enums.ItemType;
                stockCount: number | null;
                isAvailable: boolean;
                isOutOfStock: boolean;
            }[];
            _count: {
                items: number;
            };
        } & {
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateCategoryDto): Promise<{
        message: string;
        data: {
            _count: {
                items: number;
            };
        } & {
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
