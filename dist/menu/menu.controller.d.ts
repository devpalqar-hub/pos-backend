import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { StockActionDto } from './dto/stock-action.dto';
import { User } from '../../generated/prisma';
export declare class MenuController {
    private readonly menuService;
    constructor(menuService: MenuService);
    create(actor: User, restaurantId: string, dto: CreateMenuItemDto): Promise<{
        message: string;
        data: {
            restaurant: {
                name: string;
                id: string;
                currency: string;
            };
            category: {
                name: string;
                id: string;
            };
        } & {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            sortOrder: number;
        };
    }>;
    findAll(actor: User, restaurantId: string, categoryId?: string): Promise<{
        message: string;
        data: ({
            restaurant: {
                name: string;
                id: string;
                currency: string;
            };
            category: {
                name: string;
                id: string;
            };
        } & {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            sortOrder: number;
        })[];
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
        data: {
            restaurant: {
                name: string;
                id: string;
                currency: string;
            };
            category: {
                name: string;
                id: string;
            };
        } & {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            sortOrder: number;
        };
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateMenuItemDto): Promise<{
        message: string;
        data: {
            restaurant: {
                name: string;
                id: string;
                currency: string;
            };
            category: {
                name: string;
                id: string;
            };
        } & {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            sortOrder: number;
        };
    }>;
    manageStock(actor: User, restaurantId: string, id: string, dto: StockActionDto): Promise<{
        message: string;
        data: {
            restaurant: {
                name: string;
                id: string;
                currency: string;
            };
            category: {
                name: string;
                id: string;
            };
        } & {
            description: string | null;
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            imageUrl: string | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
            sortOrder: number;
        };
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
