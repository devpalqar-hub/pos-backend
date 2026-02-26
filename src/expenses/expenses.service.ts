import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { User, UserRole, ExpenseType } from '@prisma/client';

@Injectable()
export class ExpensesService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(actor: User, restaurantId: string, dto: CreateExpenseDto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        return this.prisma.expense.create({
            data: {
                restaurantId,
                expenseName: dto.expenseName,
                expenseType: dto.expenseType,
                amount: dto.amount,
                description: dto.description ?? null,
                date: dto.date ?? new Date(),
                createdById: actor.id,
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
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const where: any = {
            restaurantId,
            isActive: true,
            ...(expenseType && { expenseType }),
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
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    async findOne(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
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

        return this.prisma.expense.update({
            where: { id },
            data: {
                ...(dto.expenseName !== undefined && { expenseName: dto.expenseName }),
                ...(dto.expenseType !== undefined && { expenseType: dto.expenseType }),
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.date !== undefined && { date: dto.date }),
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
