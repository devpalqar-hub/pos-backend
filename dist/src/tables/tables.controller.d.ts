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
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TableStatus;
        seatCount: number;
        groupId: string | null;
    }>;
    findAll(actor: User, restaurantId: string, groupId?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            name: string;
            isActive: boolean;
            createdById: string | null;
            restaurantId: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TableStatus;
            seatCount: number;
            groupId: string | null;
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
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TableStatus;
        seatCount: number;
        groupId: string | null;
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
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TableStatus;
        seatCount: number;
        groupId: string | null;
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
        createdById: string | null;
        restaurantId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TableStatus;
        seatCount: number;
        groupId: string | null;
    }>;
}
