import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { StockActionDto } from './dto/stock-action.dto';
import { User } from '@prisma/client';
export declare class MenuService {
    private readonly prisma;
    private readonly s3;
    private readonly logger;
    constructor(prisma: PrismaService, s3: S3Service);
    create(actor: User, restaurantId: string, dto: CreateMenuItemDto): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
        itemType: import(".prisma/client").$Enums.ItemType;
        stockCount: number | null;
        isAvailable: boolean;
        isOutOfStock: boolean;
        outOfStockAt: Date | null;
        categoryId: string;
    }>;
    private resolveSort;
    private applyDatePricing;
    private isRuleApplicable;
    private getDayEnum;
    private formatTime;
    findAll(actor: User, restaurantId: string, page?: number, limit?: number, search?: string, sortBy?: string, date?: Date, fetchAll?: boolean): Promise<any>;
    findByCategory(actor: User, restaurantId: string, categoryId: string, page?: number, limit?: number, search?: string, sortBy?: string, date?: Date, fetchAll?: boolean): Promise<any>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
        itemType: import(".prisma/client").$Enums.ItemType;
        stockCount: number | null;
        isAvailable: boolean;
        isOutOfStock: boolean;
        outOfStockAt: Date | null;
        categoryId: string;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateMenuItemDto): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
        itemType: import(".prisma/client").$Enums.ItemType;
        stockCount: number | null;
        isAvailable: boolean;
        isOutOfStock: boolean;
        outOfStockAt: Date | null;
        categoryId: string;
    }>;
    manageStock(actor: User, restaurantId: string, id: string, dto: StockActionDto): Promise<{
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
        price: import("@prisma/client/runtime/library").Decimal;
        discountedPrice: import("@prisma/client/runtime/library").Decimal | null;
        itemType: import(".prisma/client").$Enums.ItemType;
        stockCount: number | null;
        isAvailable: boolean;
        isOutOfStock: boolean;
        outOfStockAt: Date | null;
        categoryId: string;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    autoRestockNonStockable(): Promise<void>;
    private assertRestaurantAccess;
    private requireStockable;
    private requireQuantity;
}
