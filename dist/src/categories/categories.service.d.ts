import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User } from '@prisma/client';
export declare class CategoriesService {
    private readonly prisma;
    private readonly s3;
    constructor(prisma: PrismaService, s3: S3Service);
    create(actor: User, restaurantId: string, dto: CreateCategoryDto): Promise<{
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
    }>;
    findAll(actor: User, restaurantId: string): Promise<({
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
    })[]>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
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
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateCategoryDto): Promise<{
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
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
