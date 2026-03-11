import { TablesService } from './tables.service';
import { CreateTableGroupDto } from './dto/create-table-group.dto';
import { UpdateTableGroupDto } from './dto/update-table-group.dto';
import { User } from '@prisma/client';
export declare class TableGroupsController {
    private readonly tablesService;
    constructor(tablesService: TablesService);
    create(actor: User, restaurantId: string, dto: CreateTableGroupDto): Promise<{
        _count: {
            tables: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string, fetchAll?: string): Promise<{
        data: {
            id: string;
            name: string;
            description: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            createdById: string | null;
            sortOrder: number;
            color: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        _count: {
            tables: number;
        };
        tables: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            seatCount: number;
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateTableGroupDto): Promise<{
        _count: {
            tables: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
