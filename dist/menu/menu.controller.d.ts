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
                id: string;
                name: string;
                currency: string;
            };
            category: {
                id: string;
                name: string;
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
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
        };
    }>;
    findAll(actor: User, restaurantId: string, categoryId?: string): Promise<{
        message: string;
        data: ({
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
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
            stockCount: number | null;
            isAvailable: boolean;
            isOutOfStock: boolean;
            outOfStockAt: Date | null;
        })[];
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
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
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
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
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
            categoryId: string;
            price: import("generated/prisma/runtime/library").Decimal;
            discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
            itemType: import("../../generated/prisma").$Enums.ItemType;
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
