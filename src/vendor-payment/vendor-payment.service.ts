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
        const expense = await this.prisma.expense.findUnique({
            where: { id: dto.expenseId },
            select: { id: true, restaurantId: true, amount: true },
        });

        if (!expense) {
            throw new NotFoundException('Expense not found');
        }

        if (expense.restaurantId !== dto.restaurantId) {
            throw new BadRequestException('Expense does not belong to the provided restaurant');
        }

        const aggregate = await this.prisma.vendorPayment.aggregate({
            where: { expenseId: dto.expenseId },
            _sum: { paidAmount: true },
        });

        const expenseTotalAmount = Number(expense.amount);
        const alreadyPaidAmount = Number(aggregate._sum.paidAmount ?? 0);
        const requestedPaidAmount = Number(dto.paidAmount);
        const remainingAmount = expenseTotalAmount - alreadyPaidAmount;

        if (requestedPaidAmount > remainingAmount) {
            throw new BadRequestException(
                `Overpayment not allowed. Remaining amount for this expense is ${remainingAmount.toFixed(2)}`,
            );
        }

        const dueAmount = expenseTotalAmount - (alreadyPaidAmount + requestedPaidAmount);
        const status = dueAmount === 0
            ? VendorPaymentStatus.PAID
            : VendorPaymentStatus.PENDING;

        return this.prisma.vendorPayment.create({
            data: {
                ...dto,
                totalAmount: expense.amount,
                paidAmount: dto.paidAmount,
                dueAmount,
                status,
                paidAt: status === VendorPaymentStatus.PAID ? new Date() : null,
                createdById: userId,
            },
            include: {
                vendor: true,
                Expense: true,
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
            expenseId,
            status,
            search,
        } = query;

        const where: any = {
            ...(vendorId && { vendorId }),
            ...(expenseId && { expenseId }),
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
                Expense: true,
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
                Expense: true,
            },
        });

        if (!data) throw new NotFoundException('Vendor payment not found');
        return data;
    }

    // ─── UPDATE ──────────────────────────────────────────────
    async update(id: string, dto: UpdateVendorPaymentDto) {
        const existingPayment = await this.findOne(id);

        if (dto.expenseId) {
            const expense = await this.prisma.expense.findUnique({
                where: { id: dto.expenseId },
                select: { id: true, restaurantId: true },
            });

            if (!expense) {
                throw new NotFoundException('Expense not found');
            }

            if (expense.restaurantId !== existingPayment.restaurantId) {
                throw new BadRequestException('Expense does not belong to this payment restaurant');
            }
        }

        return this.prisma.vendorPayment.update({
            where: { id },
            data: dto,
            include: {
                vendor: true,
                Expense: true,
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