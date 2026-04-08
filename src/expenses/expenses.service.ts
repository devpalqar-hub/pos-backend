import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User, UserRole, ExpenseType, VendorPaymentStatus } from '@prisma/client';

@Injectable()
export class ExpensesService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(actor: User, restaurantId: string, dto: CreateExpenseDto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const effectiveVendorId = dto.vendorId ?? dto.vendorPayment?.vendorId;

        if (dto.vendorId && dto.vendorPayment?.vendorId && dto.vendorId !== dto.vendorPayment.vendorId) {
            throw new BadRequestException(
                'vendorId and vendorPayment.vendorId must match when both are provided',
            );
        }

        if (effectiveVendorId) {
            const vendor = await this.prisma.vendor.findFirst({
                where: {
                    id: effectiveVendorId,
                    restaurantId,
                    isActive: true,
                },
                select: { id: true },
            });

            if (!vendor) {
                throw new NotFoundException('Vendor not found in this restaurant');
            }
        }

        if (dto.vendorPayment) {
            if (!effectiveVendorId) {
                throw new BadRequestException(
                    'vendorId is required on expense or vendorPayment when creating vendor payment',
                );
            }

            if (Number(dto.vendorPayment.paidAmount) <= 0) {
                throw new BadRequestException(
                    'Vendor payment paidAmount must be greater than 0',
                );
            }

            return this.prisma.$transaction(async (tx) => {
                const expense = await tx.expense.create({
                    data: {
                        restaurantId,
                        expenseName: dto.expenseName,
                        expenseType: dto.expenseType,
                        amount: dto.amount,
                        description: dto.description ?? null,
                        date: dto.date ?? new Date(),
                        createdById: actor.id,
                        expenseCategoryId: dto.expenseCategoryId ?? null,
                        vendorId: effectiveVendorId,
                    },
                });

                const [totalExpensesAggregate, totalPaidAggregate] = await Promise.all([
                    tx.expense.aggregate({
                        where: {
                            vendorId: effectiveVendorId,
                            restaurantId,
                            isActive: true,
                        },
                        _sum: { amount: true },
                    }),
                    tx.vendorPayment.aggregate({
                        where: {
                            vendorId: effectiveVendorId,
                            restaurantId,
                        },
                        _sum: { paidAmount: true },
                    }),
                ]);

                const totalExpenses = Number(totalExpensesAggregate._sum.amount ?? 0);
                const totalPaidBefore = Number(totalPaidAggregate._sum.paidAmount ?? 0);
                const requestedPaidAmount = Number(dto.vendorPayment!.paidAmount);
                const remainingAmount = totalExpenses - totalPaidBefore;

                if (requestedPaidAmount > remainingAmount) {
                    throw new BadRequestException(
                        `Overpayment not allowed. Remaining amount for this vendor is ${remainingAmount.toFixed(2)}`,
                    );
                }

                const dueAmount = totalExpenses - (totalPaidBefore + requestedPaidAmount);
                const status =
                    dueAmount === 0
                        ? VendorPaymentStatus.PAID
                        : VendorPaymentStatus.PENDING;

                await tx.vendorPayment.create({
                    data: {
                        vendorId: effectiveVendorId,
                        restaurantId,
                        paidAmount: dto.vendorPayment!.paidAmount,
                        dueAmount,
                        status,
                        type: dto.vendorPayment!.type,
                        paymentMethod: dto.vendorPayment!.paymentMethod,
                        referenceNo: dto.vendorPayment!.referenceNo,
                        notes: dto.vendorPayment!.notes,
                        paidAt: status === VendorPaymentStatus.PAID ? new Date() : null,
                        createdById: actor.id,
                    } as any,
                });

                return expense;
            });
        }

        return this.prisma.expense.create({
            data: {
                restaurantId,
                expenseName: dto.expenseName,
                expenseType: dto.expenseType,
                amount: dto.amount,
                description: dto.description ?? null,
                date: dto.date ?? new Date(),
                createdById: actor.id,
                expenseCategoryId: dto.expenseCategoryId ?? null,
                vendorId: effectiveVendorId ?? null,
            },
        });
    }

    // ─── List (paginated + filter by expenseType) ────────────────────────────

    async findAll(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        expenseType?: ExpenseType,
        search?: string,
        startDate?: Date,
        endDate?: Date,
        expenseCategoryName?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const where: any = {
            restaurantId,
            isActive: true,

            ...(expenseType && { expenseType }),

            ...(expenseCategoryName && {
                expenseCategory: {
                    name: expenseCategoryName,
                },
            }),

            ...(search && {
                OR: [
                    { expenseName: { contains: search } },
                    { description: { contains: search } },
                ],
            }),

            ...((startDate || endDate) && {
                date: {
                    ...(startDate && { gte: startDate }),
                    ...(endDate && { lte: endDate }),
                },
            }),
        };

        return paginate({
            prismaModel: this.prisma.expense,
            page,
            limit,
            where,
            include: {
                expenseCategory: true,
                vendor: true,
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async findByVendor(
        actor: User,
        restaurantId: string,
        vendorId: string,
        page = 1,
        limit = 10,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const vendor = await this.prisma.vendor.findFirst({
            where: {
                id: vendorId,
                restaurantId,
                isActive: true,
            },
            select: { id: true, name: true },
        });

        if (!vendor) {
            throw new NotFoundException('Vendor not found in this restaurant');
        }

        const where = {
            restaurantId,
            vendorId,
            isActive: true,
        };

        const [paginatedExpenses, totalExpensesAggregate, totalPaidAggregate] = await Promise.all([
            paginate({
                prismaModel: this.prisma.expense,
                page,
                limit,
                where,
                include: {
                    expenseCategory: true,
                    vendor: true,
                },
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            }),
            this.prisma.expense.aggregate({
                where,
                _sum: {
                    amount: true,
                },
            }),
            this.prisma.vendorPayment.aggregate({
                where: {
                    restaurantId,
                    vendorId,
                },
                _sum: {
                    paidAmount: true,
                },
            }),
        ]);

        const totalExpenses = Number(totalExpensesAggregate._sum.amount ?? 0);
        const totalPaid = Number(totalPaidAggregate._sum.paidAmount ?? 0);
        const totalRemainingToPay = Math.max(totalExpenses - totalPaid, 0);

        return {
            ...paginatedExpenses,
            vendor,
            totals: {
                totalExpenses,
                totalPaid,
                totalRemainingToPay,
            },
        };
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    async findOne(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
            include: {
                expenseCategory: true,
                vendor: true,
            },
        });

        if (!expense) {
            throw new NotFoundException(
                `Expense ${id} not found in restaurant ${restaurantId}`,
            );
        }

        return expense;
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    async update(
        actor: User,
        restaurantId: string,
        id: string,
        dto: UpdateExpenseDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
        });

        if (!expense) {
            throw new NotFoundException(
                `Expense ${id} not found in restaurant ${restaurantId}`,
            );
        }

        if (dto.vendorId !== undefined && dto.vendorId !== null) {
            const vendor = await this.prisma.vendor.findFirst({
                where: {
                    id: dto.vendorId,
                    restaurantId,
                    isActive: true,
                },
                select: { id: true },
            });

            if (!vendor) {
                throw new NotFoundException('Vendor not found in this restaurant');
            }
        }

        return this.prisma.expense.update({
            where: { id },
            data: {
                ...(dto.expenseName !== undefined && { expenseName: dto.expenseName }),
                ...(dto.expenseType !== undefined && { expenseType: dto.expenseType }),
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.date !== undefined && { date: dto.date }),
                ...(dto.expenseCategoryId !== undefined && { expenseCategoryId: dto.expenseCategoryId }),
                ...(dto.vendorId !== undefined && { vendorId: dto.vendorId }),
            },
        });
    }

    // ─── Delete (soft) ────────────────────────────────────────────────────────

    async remove(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        this.assertAdminOrAbove(actor);

        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
        });

        if (!expense) {
            throw new NotFoundException(
                `Expense ${id} not found in restaurant ${restaurantId}`,
            );
        }

        await this.prisma.expense.update({
            where: { id },
            data: { isActive: false },
        });

        return { message: `Expense "${expense.expenseName}" deleted successfully` };
    }

    // ─── Permission Helpers ───────────────────────────────────────────────────

    private async assertRestaurantAccess(
        actor: User,
        restaurantId: string,
        mode: 'view' | 'manage',
    ): Promise<void> {
        if (actor.role === UserRole.SUPER_ADMIN) return;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        if (actor.role === UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new ForbiddenException('You do not own this restaurant');
            }
            return;
        }

        // RESTAURANT_ADMIN, WAITER, CHEF — must be assigned to this restaurant
        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException('You are not assigned to this restaurant');
        }

        // WAITER / CHEF / BILLER can only view, not manage
        if (
            mode === 'manage' &&
            (actor.role === UserRole.WAITER ||
                actor.role === UserRole.CHEF ||
                actor.role === UserRole.BILLER)
        ) {
            throw new ForbiddenException(
                'WAITER, CHEF and BILLER can only view expenses, not create or edit them',
            );
        }
    }

    private assertAdminOrAbove(actor: User): void {
        const allowed: UserRole[] = [
            UserRole.SUPER_ADMIN,
            UserRole.OWNER,
            UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new ForbiddenException(
                'Insufficient permissions to delete expenses',
            );
        }
    }
}
