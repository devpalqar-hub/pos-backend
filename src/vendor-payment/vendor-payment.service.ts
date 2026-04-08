import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVendorPaymentDto } from './dto/create-vendor-payment.dto';
import { UpdateVendorPaymentDto } from './dto/update-vendor-payment.dto';
import { VendorPaymentQueryDto } from './dto/vendor-payment-query.dto';
import { paginate } from 'src/common/utlility/pagination.util';
import { VendorPaymentStatus } from '@prisma/client';

@Injectable()
export class VendorPaymentService {
    constructor(private prisma: PrismaService) { }

    // ─── CREATE ─────────────────────────────────────────────
    async create(dto: CreateVendorPaymentDto, userId?: string) {
        const vendor = await this.prisma.vendor.findFirst({
            where: {
                id: dto.vendorId,
                restaurantId: dto.restaurantId,
                isActive: true,
            },
            select: { id: true },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found in this restaurant');
        }

        const [totalExpensesAggregate, totalPaidAggregate] = await Promise.all([
            this.prisma.expense.aggregate({
                where: {
                    vendorId: dto.vendorId,
                    restaurantId: dto.restaurantId,
                    isActive: true,
                },
                _sum: { amount: true },
            }),
            this.prisma.vendorPayment.aggregate({
                where: {
                    vendorId: dto.vendorId,
                    restaurantId: dto.restaurantId,
                },
                _sum: { paidAmount: true },
            }),
        ]);

        const totalExpensesAmount = Number(totalExpensesAggregate._sum.amount ?? 0);
        const alreadyPaidAmount = Number(totalPaidAggregate._sum.paidAmount ?? 0);
        const remainingAmount = totalExpensesAmount - alreadyPaidAmount;
        const requestedPaidAmount = Number(dto.paidAmount);

        if (requestedPaidAmount > remainingAmount) {
            throw new BadRequestException(
                `Overpayment not allowed. Remaining amount for this vendor is ${remainingAmount.toFixed(2)}`,
            );
        }

        const dueAmount = totalExpensesAmount - (alreadyPaidAmount + requestedPaidAmount);
        const status = dueAmount === 0
            ? VendorPaymentStatus.PAID
            : VendorPaymentStatus.PENDING;

        return this.prisma.vendorPayment.create({
            data: {
                ...dto,
                paidAmount: dto.paidAmount,
                dueAmount,
                status,
                paidAt: status === VendorPaymentStatus.PAID ? new Date() : null,
                createdById: userId,
            } as any,
            include: {
                vendor: true,
            },
        });
    }

    // ─── FIND ALL (Pagination + Filters) ─────────────────────
    async findAll(query: VendorPaymentQueryDto) {
        const {
            page = 1,
            limit = 10,
            fetchAll,
            vendorId,
            status,
            search,
        } = query;

        const where: any = {
            ...(vendorId && { vendorId }),
            ...(status && { status }),
            ...(search && {
                OR: [
                    {
                        vendor: {
                            name: {
                                contains: search,

                            },
                        },
                    },
                    {
                        notes: {
                            contains: search,

                        },
                    },
                ],
            }),
        };

        return paginate({
            prismaModel: this.prisma.vendorPayment,
            page: Number(page),
            limit: Number(limit),
            fetchAll: fetchAll === true || fetchAll === ('true' as any),
            where,
            include: {
                vendor: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    // ─── FIND ONE ────────────────────────────────────────────
    async findOne(id: string) {
        const data = await this.prisma.vendorPayment.findUnique({
            where: { id },
            include: {
                vendor: true,
            },
        });

        if (!data) throw new NotFoundException('Vendor payment not found');
        return data;
    }

    // ─── UPDATE ──────────────────────────────────────────────
    async update(id: string, dto: UpdateVendorPaymentDto) {
        const existingPayment = await this.findOne(id);

        const vendorId = dto.vendorId ?? existingPayment.vendorId;
        const restaurantId = dto.restaurantId ?? existingPayment.restaurantId;
        const paidAmount = Number(dto.paidAmount ?? existingPayment.paidAmount);

        const vendor = await this.prisma.vendor.findFirst({
            where: {
                id: vendorId,
                restaurantId,
                isActive: true,
            },
            select: { id: true },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found in this restaurant');
        }

        const [totalExpensesAggregate, totalPaidOtherAggregate] = await Promise.all([
            this.prisma.expense.aggregate({
                where: {
                    vendorId,
                    restaurantId,
                    isActive: true,
                },
                _sum: { amount: true },
            }),
            this.prisma.vendorPayment.aggregate({
                where: {
                    vendorId,
                    restaurantId,
                    NOT: { id },
                },
                _sum: { paidAmount: true },
            }),
        ]);

        const totalExpensesAmount = Number(totalExpensesAggregate._sum.amount ?? 0);
        const alreadyPaidByOthers = Number(totalPaidOtherAggregate._sum.paidAmount ?? 0);
        const remainingAmount = totalExpensesAmount - alreadyPaidByOthers;

        if (paidAmount > remainingAmount) {
            throw new BadRequestException(
                `Overpayment not allowed. Remaining amount for this vendor is ${remainingAmount.toFixed(2)}`,
            );
        }

        const dueAmount = totalExpensesAmount - (alreadyPaidByOthers + paidAmount);
        const status = dueAmount === 0
            ? VendorPaymentStatus.PAID
            : VendorPaymentStatus.PENDING;

        return this.prisma.vendorPayment.update({
            where: { id },
            data: {
                ...dto,
                dueAmount,
                status,
                paidAt: status === VendorPaymentStatus.PAID ? new Date() : null,
            },
            include: {
                vendor: true,
            },
        });
    }

    // ─── DELETE (Soft delete alternative optional) ───────────
    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.vendorPayment.delete({
            where: { id },
        });
    }
}