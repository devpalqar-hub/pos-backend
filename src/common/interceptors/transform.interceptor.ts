import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

export interface ApiResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data: T;
    meta?: PaginationMeta;
    timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        const statusCode = context.switchToHttp().getResponse().statusCode;

        return next.handle().pipe(
            map((data) => {
                // Check if response has pagination metadata
                if (data?.meta && data?.data !== undefined) {
                    return {
                        success: true,
                        statusCode,
                        message: data?.message ?? 'Request successful',
                        data: data.data,
                        meta: data.meta,
                        timestamp: new Date().toISOString(),
                    };
                }

                // Standard response without pagination
                return {
                    success: true,
                    statusCode,
                    message: data?.message ?? 'Request successful',
                    data: data?.data !== undefined ? data.data : data,
                    timestamp: new Date().toISOString(),
                };
            }),
        );
    }
}

