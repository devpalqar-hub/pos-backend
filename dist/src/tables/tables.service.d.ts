import { PrismaService } from '../prisma/prisma.service';
import { CreateTableGroupDto } from './dto/create-table-group.dto';
import { UpdateTableGroupDto } from './dto/update-table-group.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { User } from '@prisma/client';
export declare class TablesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private assertRestaurantAccess;
    createGroup(actor: User, restaurantId: string, dto: CreateTableGroupDto): Promise<{
        _count: {
            tables: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        color: string | null;
        sortOrder: number;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    findAllGroups(actor: User, restaurantId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            name: string;
            description: string | null;
            color: string | null;
            sortOrder: number;
            isActive: boolean;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
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
    findOneGroup(actor: User, restaurantId: string, id: string): Promise<{
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
        description: string | null;
        color: string | null;
        sortOrder: number;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    updateGroup(actor: User, restaurantId: string, id: string, dto: UpdateTableGroupDto): Promise<{
        _count: {
            tables: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        color: string | null;
        sortOrder: number;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
    }>;
    removeGroup(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    createTable(actor: User, restaurantId: string, dto: CreateTableDto): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        groupId: string | null;
        seatCount: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
    findAllTables(actor: User, restaurantId: string, groupId?: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            groupId: string | null;
            seatCount: number;
            status: import(".prisma/client").$Enums.TableStatus;
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
    findUngroupedTables(actor: User, restaurantId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            groupId: string | null;
            seatCount: number;
            status: import(".prisma/client").$Enums.TableStatus;
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
    findOneTable(actor: User, restaurantId: string, id: string): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        groupId: string | null;
        seatCount: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
    updateTable(actor: User, restaurantId: string, id: string, dto: UpdateTableDto): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        groupId: string | null;
        seatCount: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
    removeTable(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    assignTableToGroup(actor: User, restaurantId: string, tableId: string, groupId: string | null): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdById: string | null;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        groupId: string | null;
        seatCount: number;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
}
