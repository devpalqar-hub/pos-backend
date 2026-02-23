import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { StockActionDto } from './dto/stock-action.dto';
import { User } from '../../generated/prisma';
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
        description: string | null;
        price: import("generated/prisma/runtime/library").Decimal;
        discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
        imageUrl: string | null;
        itemType: import("../../generated/prisma").$Enums.ItemType;
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
    }>;
    findAll(actor: User, restaurantId: string): Promise<({
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
        price: import("generated/prisma/runtime/library").Decimal;
        discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
        imageUrl: string | null;
        itemType: import("../../generated/prisma").$Enums.ItemType;
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
    })[]>;
    findByCategory(actor: User, restaurantId: string, categoryId: string): Promise<({
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
        price: import("generated/prisma/runtime/library").Decimal;
        discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
        imageUrl: string | null;
        itemType: import("../../generated/prisma").$Enums.ItemType;
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
    })[]>;
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
        description: string | null;
        price: import("generated/prisma/runtime/library").Decimal;
        discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
        imageUrl: string | null;
        itemType: import("../../generated/prisma").$Enums.ItemType;
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
        description: string | null;
        price: import("generated/prisma/runtime/library").Decimal;
        discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
        imageUrl: string | null;
        itemType: import("../../generated/prisma").$Enums.ItemType;
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
        description: string | null;
        price: import("generated/prisma/runtime/library").Decimal;
        discountedPrice: import("generated/prisma/runtime/library").Decimal | null;
        imageUrl: string | null;
        itemType: import("../../generated/prisma").$Enums.ItemType;
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
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    autoRestockNonStockable(): Promise<void>;
    private assertRestaurantAccess;
    private requireStockable;
    private requireQuantity;
}
