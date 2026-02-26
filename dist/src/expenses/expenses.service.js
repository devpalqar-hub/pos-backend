"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const pagination_util_1 = require("../common/utlility/pagination.util");
const client_1 = require("@prisma/client");
let ExpensesService = class ExpensesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(actor, restaurantId, dto) {
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
    async findAll(actor, restaurantId, page = 1, limit = 10, expenseType, search, startDate, endDate) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const where = {
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
        return (0, pagination_util_1.paginate)({
            prismaModel: this.prisma.expense,
            page,
            limit,
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async findOne(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
        });
        if (!expense) {
            throw new common_1.NotFoundException(`Expense ${id} not found in restaurant ${restaurantId}`);
        }
        return expense;
    }
    async update(actor, restaurantId, id, dto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
        });
        if (!expense) {
            throw new common_1.NotFoundException(`Expense ${id} not found in restaurant ${restaurantId}`);
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
    async remove(actor, restaurantId, id) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        this.assertAdminOrAbove(actor);
        const expense = await this.prisma.expense.findFirst({
            where: { id, restaurantId },
        });
        if (!expense) {
            throw new common_1.NotFoundException(`Expense ${id} not found in restaurant ${restaurantId}`);
        }
        await this.prisma.expense.update({
            where: { id },
            data: { isActive: false },
        });
        return { message: `Expense "${expense.expenseName}" deleted successfully` };
    }
    async assertRestaurantAccess(actor, restaurantId, mode) {
        if (actor.role === client_1.UserRole.SUPER_ADMIN)
            return;
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new common_1.NotFoundException(`Restaurant ${restaurantId} not found`);
        if (actor.role === client_1.UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new common_1.ForbiddenException('You do not own this restaurant');
            }
            return;
        }
        if (actor.restaurantId !== restaurantId) {
            throw new common_1.ForbiddenException('You are not assigned to this restaurant');
        }
        if (mode === 'manage' &&
            (actor.role === client_1.UserRole.WAITER ||
                actor.role === client_1.UserRole.CHEF ||
                actor.role === client_1.UserRole.BILLER)) {
            throw new common_1.ForbiddenException('WAITER, CHEF and BILLER can only view expenses, not create or edit them');
        }
    }
    assertAdminOrAbove(actor) {
        const allowed = [
            client_1.UserRole.SUPER_ADMIN,
            client_1.UserRole.OWNER,
            client_1.UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new common_1.ForbiddenException('Insufficient permissions to delete expenses');
        }
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map