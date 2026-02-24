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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    findAll(actor: User, restaurantId: string): Promise<({
        tables: {
            id: string;
            name: string;
            isActive: boolean;
            seatCount: number;
        }[];
        _count: {
            tables: number;
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
        sortOrder: number;
        color: string | null;
    })[]>;
    findOne(actor: User, restaurantId: string, id: string): Promise<{
        tables: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            seatCount: number;
        }[];
        _count: {
            tables: number;
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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
}
