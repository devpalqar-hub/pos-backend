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
        name: string;
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        color: string | null;
        sortOrder: number;
    }>;
    findAll(actor: User, restaurantId: string, page?: string, limit?: string): Promise<{
        data: {
            name: string;
            id: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            color: string | null;
            sortOrder: number;
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
        tables: {
            name: string;
            id: string;
            isActive: boolean;
            createdAt: Date;
            seatCount: number;
        }[];
        _count: {
            tables: number;
        };
    } & {
        name: string;
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        color: string | null;
        sortOrder: number;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateTableGroupDto): Promise<{
        _count: {
            tables: number;
        };
    } & {
        name: string;
        id: string;
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        color: string | null;
        sortOrder: number;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
