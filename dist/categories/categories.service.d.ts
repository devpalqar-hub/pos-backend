import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User } from '../../generated/prisma';
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
        description: string | null;
        imageUrl: string | null;
        isActive: boolean;
        sortOrder: number;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    findAll(actor: User, restaurantId: string): Promise<({
        _count: {
            items: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        isActive: boolean;
        sortOrder: number;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    })[]>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
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
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        isActive: boolean;
        sortOrder: number;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateCategoryDto): Promise<{
        _count: {
            items: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        imageUrl: string | null;
        isActive: boolean;
        sortOrder: number;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
