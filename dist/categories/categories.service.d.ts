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
    }>;
    findAll(actor: User, restaurantId: string): Promise<({
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
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateCategoryDto): Promise<{
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
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    private assertRestaurantAccess;
    private assertAdminOrAbove;
}
