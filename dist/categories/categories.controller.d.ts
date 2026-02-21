import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User } from '../../generated/prisma';
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
            description: string | null;
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            sortOrder: number;
        };
    }>;
    findAll(actor: User, restaurantId: string): Promise<{
        message: string;
        data: ({
            _count: {
                items: number;
            };
        } & {
            description: string | null;
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            sortOrder: number;
        })[];
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
        data: {
            items: {
                id: string;
                name: string;
                imageUrl: string | null;
                price: import("generated/prisma/runtime/library").Decimal;
                discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
                itemType: import("../../generated/prisma").$Enums.ItemType;
                stockCount: number | null;
                isAvailable: boolean;
                isOutOfStock: boolean;
            }[];
            _count: {
                items: number;
            };
        } & {
            description: string | null;
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
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
            description: string | null;
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            imageUrl: string | null;
            sortOrder: number;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
