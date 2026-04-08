import { IsOptional, IsNumber, IsString, IsEnum, IsUUID } from 'class-validator';
import { VendorPaymentStatus } from '@prisma/client';

export class VendorPaymentQueryDto {
    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number;

    @IsOptional()
    fetchAll?: boolean;

    @IsOptional()
    @IsUUID()
    vendorId?: string;

    @IsOptional()
    @IsEnum(VendorPaymentStatus)
    status?: VendorPaymentStatus;

    @IsOptional()
    @IsString()
    search?: string;
}