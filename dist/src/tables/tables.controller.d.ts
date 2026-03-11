import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { User } from '@prisma/client';
export declare class TablesController {
    private readonly tablesService;
    constructor(tablesService: TablesService);
    create(actor: User, restaurantId: string, dto: CreateTableDto): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
        groupId: string | null;
        seatCount: number;
    }>;
    findAll(actor: User, restaurantId: string, groupId?: string, page?: string, limit?: string, fetchAll?: string): Promise<{
        data: {
            id: string;
            name: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            restaurantId: string;
            createdById: string | null;
            status: import(".prisma/client").$Enums.TableStatus;
            groupId: string | null;
            seatCount: number;
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
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
        groupId: string | null;
        seatCount: number;
    }>;
    update(actor: User, restaurantId: string, id: string, dto: UpdateTableDto): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
        groupId: string | null;
        seatCount: number;
    }>;
    remove(actor: User, restaurantId: string, id: string): Promise<{
        message: string;
    }>;
    assignGroup(actor: User, restaurantId: string, id: string, groupId: string | null): Promise<{
        group: {
            id: string;
            name: string;
            color: string | null;
        } | null;
    } & {
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        restaurantId: string;
        createdById: string | null;
        status: import(".prisma/client").$Enums.TableStatus;
        groupId: string | null;
        seatCount: number;
    }>;
}
