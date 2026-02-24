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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    findAllGroups(actor: User, restaurantId: string): Promise<({
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
        isActive: boolean;
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        sortOrder: number;
        color: string | null;
    }>;
    updateGroup(actor: User, restaurantId: string, id: string, dto: UpdateTableGroupDto): Promise<{
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        seatCount: number;
        groupId: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
    findAllTables(actor: User, restaurantId: string, groupId?: string): Promise<({
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        seatCount: number;
        groupId: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
    })[]>;
    findUngroupedTables(actor: User, restaurantId: string): Promise<({
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        seatCount: number;
        groupId: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
    })[]>;
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        seatCount: number;
        groupId: string | null;
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        seatCount: number;
        groupId: string | null;
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
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        seatCount: number;
        groupId: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
    }>;
}
