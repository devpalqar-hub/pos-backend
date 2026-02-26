import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { StockActionDto } from './dto/stock-action.dto';
import { User } from '@prisma/client';
export declare class MenuController {
    private readonly menuService;
    constructor(menuService: MenuService);
    create(actor: User, restaurantId: string, dto: CreateMenuItemDto): Promise<{
        message: string;
        data: {
            restaurant: {
                id: string;
                name: string;
                currency: string;
            };
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            isActive: boolean;
            sortOrder: number;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            categoryId: string;
        };
    }>;
    findAll(actor: User, restaurantId: string, categoryId?: string, page?: string, limit?: string, search?: string, sortBy?: string): Promise<{
        message: string;
        data: {
            data: {
                id: string;
                name: string;
                description: string | null;
                price: import("@prisma/client/runtime/library").Decimal;
                discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
                imageUrl: string | null;
                itemType: import(".prisma/client").$Enums.ItemType;
                stockCount: number | null;
                isAvailable: boolean;
                isOutOfStock: boolean;
                outOfStockAt: Date | null;
                isActive: boolean;
                sortOrder: number;
                createdById: string | null;
                createdAt: Date;
                updatedAt: Date;
                restaurantId: string;
                categoryId: string;
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
            restaurant: {
                id: string;
                name: string;
                currency: string;
            };
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            isActive: boolean;
            sortOrder: number;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            categoryId: string;
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateMenuItemDto): Promise<{
        message: string;
        data: {
            restaurant: {
                id: string;
                name: string;
                currency: string;
            };
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            isActive: boolean;
            sortOrder: number;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            categoryId: string;
        };
    }>;
    manageStock(actor: User, restaurantId: string, id: string, dto: StockActionDto): Promise<{
        message: string;
        data: {
            restaurant: {
                id: string;
                name: string;
                currency: string;
            };
            category: {
                id: string;
                name: string;
            };
        } & {
            id: string;
            name: string;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            isActive: boolean;
            sortOrder: number;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            categoryId: string;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
