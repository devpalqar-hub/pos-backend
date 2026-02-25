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
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
            categoryId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
        };
    }>;
    findAll(actor: User, restaurantId: string, categoryId?: string, page?: string, limit?: string): Promise<{
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
                categoryId: string;
                price: import("@prisma/client/runtime/library").Decimal;
                discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
                itemType: import(".prisma/client").$Enums.ItemType;
                stockCount: number | null;
                isAvailable: boolean;
                isOutOfStock: boolean;
                outOfStockAt: Date | null;
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
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
            categoryId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
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
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
            categoryId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
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
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            imageUrl: string | null;
            sortOrder: number;
            categoryId: string;
            price: import("@prisma/client/runtime/library").Decimal;
            discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
            itemType: import(".prisma/client").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
