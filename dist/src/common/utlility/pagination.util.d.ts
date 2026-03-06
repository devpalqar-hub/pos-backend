import { Prisma } from '@prisma/client';
interface PaginationParams<T> {
    prismaModel: {
        findMany: (args?: any) => Promise<T[]>;
        count: (args?: any) => Promise<number>;
    };
    page?: number;
    limit?: number;
    fetchAll?: boolean;
    where?: Prisma.Enumerable<any>;
    include?: Prisma.Enumerable<any>;
    orderBy?: Prisma.Enumerable<any>;
}
export declare function paginate<T>({ prismaModel, page, limit, fetchAll, where, include, orderBy, }: PaginationParams<T>): Promise<{
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}>;
export {};
