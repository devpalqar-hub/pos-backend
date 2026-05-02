import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, BillStatus, PayrollStatus, DayOfWeek, ExpenseType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Profit & Loss ───────────────────────────────────────────────────────

    async getProfitAndLoss(
        actor: User,
        restaurantId: string | null,
        period: 'last7' | 'last30' | 'quarterly' | 'yearly',
    ) {
        const restaurantIds = await this.resolveRestaurantIds(
            actor,
            restaurantId,
        );

        const { currentStart, currentEnd, previousStart, previousEnd } =
            this.getDateRanges(period);

        // ── Current period ────────────────────────────────────────────────────
        const [curRevenue, curExpenses, curPayroll] = await Promise.all([
            this.sumRevenue(restaurantIds, currentStart, currentEnd),
            this.sumExpenses(restaurantIds, currentStart, currentEnd),
            this.sumPayroll(restaurantIds, currentStart, currentEnd),
        ]);

        // ── Previous period (for % change) ───────────────────────────────────
        const [prevRevenue, prevExpenses, prevPayroll] = await Promise.all([
            this.sumRevenue(restaurantIds, previousStart, previousEnd),
            this.sumExpenses(restaurantIds, previousStart, previousEnd),
            this.sumPayroll(restaurantIds, previousStart, previousEnd),
        ]);

        const totalRevenue = curRevenue;
        const totalExpenses = curExpenses + curPayroll;
        const grossProfit = curRevenue - curExpenses;
        const netProfit = curRevenue - totalExpenses;

        const prevTotalExpenses = prevExpenses + prevPayroll;
        const prevGrossProfit = prevRevenue - prevExpenses;
        const prevNetProfit = prevRevenue - prevTotalExpenses;

        // ── Monthly chart data ────────────────────────────────────────────────
        const chartData = await this.getMonthlyChartData(
            restaurantIds,
            currentStart,
            currentEnd,
        );

        return {
            totalRevenue: this.round2(totalRevenue),
            totalRevenueChange: this.pctChange(prevRevenue, totalRevenue),
            totalExpenses: this.round2(totalExpenses),
            totalExpensesChange: this.pctChange(prevTotalExpenses, totalExpenses),
            grossProfit: this.round2(grossProfit),
            grossProfitChange: this.pctChange(prevGrossProfit, grossProfit),
            netProfit: this.round2(netProfit),
            netProfitChange: this.pctChange(prevNetProfit, netProfit),
            chartData,
        };
    }

    // ─── Revenue: sum of paid bills ───────────────────────────────────────────

    private async sumRevenue(
        restaurantIds: string[],
        start: Date,
        end: Date,
    ): Promise<number> {
        const result = await this.prisma.bill.aggregate({
            _sum: { totalAmount: true },
            where: {
                restaurantId: { in: restaurantIds },
                status: BillStatus.PAID,
                OR: [
                    {
                        paidAt: { gte: start, lte: end },
                    },
                    {
                        paidAt: null,
                        createdAt: { gte: start, lte: end },
                    },
                ],
            },
        });
        return this.toNumber(result._sum.totalAmount);
    }

    // ─── Expenses: sum of expense records ─────────────────────────────────────

    private async sumExpenses(
        restaurantIds: string[],
        start: Date,
        end: Date,
    ): Promise<number> {
        const result = await this.prisma.expense.aggregate({
            _sum: { amount: true },
            where: {
                restaurantId: { in: restaurantIds },
                isActive: true,
                date: { gte: start, lte: end },
            },
        });
        return this.toNumber(result._sum.amount);
    }

    // ─── Payroll: sum of processed/paid payrolls ──────────────────────────────

    private async sumPayroll(
        restaurantIds: string[],
        start: Date,
        end: Date,
    ): Promise<number> {
        // Derive month/year range from dates
        const startMonth = start.getMonth() + 1;
        const startYear = start.getFullYear();
        const endMonth = end.getMonth() + 1;
        const endYear = end.getFullYear();

        const result = await this.prisma.payroll.aggregate({
            _sum: { finalSalary: true },
            where: {
                restaurantId: { in: restaurantIds },
                status: { in: [PayrollStatus.PROCESSED, PayrollStatus.PAID] },
                OR: this.buildMonthYearRange(
                    startMonth,
                    startYear,
                    endMonth,
                    endYear,
                ),
            },
        });
        return this.toNumber(result._sum.finalSalary);
    }

    private async assertRestaurantAccess(actor: User, restaurantId: string) {

        if (actor.role === UserRole.SUPER_ADMIN) {
            return;
        }

        if (actor.role === UserRole.OWNER) {
            const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
            if (!restaurant) {
                throw new NotFoundException(`Restaurant ${restaurantId} not found`);
            }
            if (restaurant.ownerId !== actor.id) {
                throw new ForbiddenException('You do not own this restaurant');
            }
            return;
        }

        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException(
                `User does not have access to restaurant ${restaurantId}`,
            );
        }
    }

    // ─── Monthly Chart Data ───────────────────────────────────────────────────

    private async getMonthlyChartData(
        restaurantIds: string[],
        start: Date,
        end: Date,
    ) {
        const months: {
            month: string;
            revenue: number;
            expenses: number;
        }[] = [];

        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const endDate = new Date(end.getFullYear(), end.getMonth(), 1);

        while (cursor <= endDate) {
            const monthStart = new Date(cursor);
            const monthEnd = new Date(
                cursor.getFullYear(),
                cursor.getMonth() + 1,
                0,
                23,
                59,
                59,
                999,
            );

            const [revenue, expenses, payroll] = await Promise.all([
                this.sumRevenue(restaurantIds, monthStart, monthEnd),
                this.sumExpenses(restaurantIds, monthStart, monthEnd),
                this.sumPayroll(restaurantIds, monthStart, monthEnd),
            ]);

            const label = monthStart.toLocaleString('en-US', {
                month: 'short',
            });

            const now = new Date();
            const isCurrent =
                cursor.getMonth() === now.getMonth() &&
                cursor.getFullYear() === now.getFullYear();

            months.push({
                month: isCurrent ? `${label} (Current)` : label,
                revenue: this.round2(revenue),
                expenses: this.round2(expenses + payroll),
            });

            cursor.setMonth(cursor.getMonth() + 1);
        }

        return months;
    }

    // ─── Date Range Helpers ───────────────────────────────────────────────────

    private getDateRanges(period: 'last7' | 'last30' | 'quarterly' | 'yearly') {
        const now = new Date();
        let currentStart: Date;
        let currentEnd: Date;
        let previousStart: Date;
        let previousEnd: Date;

        switch (period) {
            case 'last7': {
                currentEnd = now;
                currentStart = new Date(now);
                currentStart.setDate(currentStart.getDate() - 7);

                previousEnd = new Date(currentStart);
                previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

                previousStart = new Date(previousEnd);
                previousStart.setDate(previousStart.getDate() - 7);
                break;
            }
            case 'last30': {
                currentEnd = now;
                currentStart = new Date(now);
                currentStart.setDate(currentStart.getDate() - 30);
                previousEnd = new Date(currentStart);
                previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
                previousStart = new Date(previousEnd);
                previousStart.setDate(previousStart.getDate() - 30);
                break;
            }
            case 'quarterly': {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
                currentEnd = now;
                const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
                const prevYear =
                    currentQuarter === 0
                        ? now.getFullYear() - 1
                        : now.getFullYear();
                previousStart = new Date(prevYear, prevQuarter * 3, 1);
                previousEnd = new Date(
                    prevYear,
                    prevQuarter * 3 + 3,
                    0,
                    23,
                    59,
                    59,
                    999,
                );
                break;
            }
            case 'yearly': {
                currentStart = new Date(now.getFullYear(), 0, 1);
                currentEnd = now;
                previousStart = new Date(now.getFullYear() - 1, 0, 1);
                previousEnd = new Date(
                    now.getFullYear() - 1,
                    11,
                    31,
                    23,
                    59,
                    59,
                    999,
                );
                break;
            }
        }

        return { currentStart, currentEnd, previousStart, previousEnd };
    }

    // ─── Resolve Restaurant IDs ───────────────────────────────────────────────

    private async resolveRestaurantIds(
        actor: User,
        restaurantId: string | null,
    ): Promise<string[]> {
        if (actor.role === UserRole.SUPER_ADMIN) {
            if (restaurantId) return [restaurantId];
            const all = await this.prisma.restaurant.findMany({
                select: { id: true },
            });
            return all.map((r) => r.id);
        }

        if (actor.role === UserRole.OWNER) {
            if (restaurantId) {
                const restaurant = await this.prisma.restaurant.findUnique({
                    where: { id: restaurantId },
                });
                if (!restaurant)
                    throw new NotFoundException(
                        `Restaurant ${restaurantId} not found`,
                    );
                console.log(restaurant.ownerId, actor.id, "owner id vs actor id")
                if (restaurant.ownerId !== actor.id)

                    throw new ForbiddenException(
                        'You do not own this restaurant',
                    );
                return [restaurantId];
            }
            // All locations owned by this user
            const owned = await this.prisma.restaurant.findMany({
                where: { ownerId: actor.id },
                select: { id: true },
            });
            return owned.map((r) => r.id);
        }

        // Staff roles — single restaurant only
        if (!actor.restaurantId)
            throw new ForbiddenException(
                'You are not assigned to any restaurant',
            );
        return [actor.restaurantId];
    }

    // ─── Month/Year range builder for payroll ─────────────────────────────────

    private buildMonthYearRange(
        startMonth: number,
        startYear: number,
        endMonth: number,
        endYear: number,
    ) {
        const conditions: { month: number; year: number }[] = [];
        let y = startYear;
        let m = startMonth;
        while (y < endYear || (y === endYear && m <= endMonth)) {
            conditions.push({ month: m, year: y });
            m++;
            if (m > 12) {
                m = 1;
                y++;
            }
        }
        return conditions.map((c) => ({ month: c.month, year: c.year }));
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    private toNumber(val: Decimal | null): number {
        return val ? parseFloat(val.toString()) : 0;
    }

    private round2(val: number): number {
        return parseFloat(val.toFixed(2));
    }

    private pctChange(prev: number, current: number): number {
        if (prev === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - prev) / Math.abs(prev)) * 100).toFixed(1));
    }

    // ─── Loyalty Programs Analytics ───────────────────────────────────────────

    async getLoyaltyProgramsAnalytics(
        actor: User,
        restaurantId: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date(now);
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        // 1. Total active programs
        const totalActivePrograms = await this.prisma.loyalityPoint.count({
            where: { restaurantId, isActive: true },
        });

        // 2. New programs created in the last 30 days
        const newProgramsCount = await this.prisma.loyalityPoint.count({
            where: {
                restaurantId,
                createdAt: { gte: thirtyDaysAgo },
            },
        });

        // 3. Total amount redeemed across all programs
        const totalAmountRedeemedAgg = await this.prisma.loyalityPointRedemption.aggregate({
            _sum: { pointsAwarded: true },
            where: { loyalityPoint: { restaurantId } },
        });
        const totalAmountRedeemed = parseFloat(
            (totalAmountRedeemedAgg._sum.pointsAwarded ?? 0).toString(),
        );

        const totalMembers = await this.prisma.customer.count({
            where: { restaurantId, isActive: true },
        });

        // 4. Redemption rate: unique customers who redeemed / total members
        const currentPeriodRedemptions =
            await this.prisma.loyalityPointRedemption.findMany({
                where: {
                    loyalityPoint: { restaurantId },
                    redeemedAt: { gte: thirtyDaysAgo },
                },
                select: { customerId: true },
            });
        const currentUniqueRedeemers = new Set(
            currentPeriodRedemptions.map((r) => r.customerId),
        ).size;

        const previousPeriodRedemptions =
            await this.prisma.loyalityPointRedemption.findMany({
                where: {
                    loyalityPoint: { restaurantId },
                    redeemedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
                },
                select: { customerId: true },
            });
        const previousUniqueRedeemers = new Set(
            previousPeriodRedemptions.map((r) => r.customerId),
        ).size;

        const redemptionRate =
            totalMembers > 0
                ? parseFloat(
                    ((currentUniqueRedeemers / totalMembers) * 100).toFixed(1),
                )
                : 0;

        const previousRedemptionRate =
            totalMembers > 0
                ? parseFloat(
                    ((previousUniqueRedeemers / totalMembers) * 100).toFixed(1),
                )
                : 0;

        const redemptionRateChange = parseFloat(
            (redemptionRate - previousRedemptionRate).toFixed(1),
        );

        return {
            totalActivePrograms,
            newProgramsCount,
            redemptionRate,
            redemptionRateChange,
            totalAmountRedeemed,
        };
    }

    // ─── Employee Directory Analytics ─────────────────────────────────────────

    private readonly dayMap: Record<number, DayOfWeek> = {
        0: DayOfWeek.SUNDAY,
        1: DayOfWeek.MONDAY,
        2: DayOfWeek.TUESDAY,
        3: DayOfWeek.WEDNESDAY,
        4: DayOfWeek.THURSDAY,
        5: DayOfWeek.FRIDAY,
        6: DayOfWeek.SATURDAY,
    };

    async getEmployeeAnalytics(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const todayStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );

        // 1. Total employees (active staff)
        const totalEmployees = await this.prisma.staff.count({
            where: { restaurantId, isActive: true },
        });

        // 2. New employees this month
        const newThisMonth = await this.prisma.staff.count({
            where: {
                restaurantId,
                isActive: true,
                createdAt: { gte: monthStart },
            },
        });

        // 3. Active today = staff whose working days include today AND not on leave today
        const todayDay = this.dayMap[now.getDay()];

        const staffScheduledToday = await this.prisma.staff.count({
            where: {
                restaurantId,
                isActive: true,
                workingDays: { some: { day: todayDay } },
            },
        });

        const staffOnLeaveToday = await this.prisma.staffLeave.count({
            where: {
                staff: { restaurantId, isActive: true },
                date: todayStart,
            },
        });

        const activeToday = Math.max(0, staffScheduledToday - staffOnLeaveToday);

        // 4. Monthly payroll estimate = sum of monthlySalary for active staff
        const payrollEstimate = await this.prisma.staff.aggregate({
            _sum: { monthlySalary: true },
            where: { restaurantId, isActive: true },
        });

        const currentMonth = now.toLocaleString('en-US', {
            month: 'long',
            year: 'numeric',
        });

        return {
            totalEmployees,
            newThisMonth,
            activeToday,
            monthlyPayrollTotal: this.toNumber(payrollEstimate._sum.monthlySalary),
            currentMonth,
        };
    }


    async getExpenseAnalytics(
        actor: User,
        restaurantId: string,
        month?: number,
        months = 6,
    ) {

        await this.assertRestaurantAccess(actor, restaurantId)

        const now = new Date()
        const targetMonth = month ?? now.getMonth() + 1
        const year = now.getFullYear()

        const startOfMonth = new Date(year, targetMonth - 1, 1)
        const endOfMonth = new Date(year, targetMonth, 0, 23, 59, 59)

        // TOTAL EXPENSE THIS MONTH
        const totalExpenseAgg = await this.prisma.expense.aggregate({
            where: {
                restaurantId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                isActive: true,
            },
            _sum: {
                amount: true,
            },
        })

        const totalExpense = Number(totalExpenseAgg._sum.amount ?? 0)

        // TOP EXPENSE CATEGORY
        const categoryAgg = await this.prisma.expense.groupBy({
            by: ['expenseCategoryId'],
            where: {
                restaurantId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
                isActive: true,
            },
            _sum: {
                amount: true,
            },
            orderBy: {
                _sum: {
                    amount: 'desc',
                },
            },
            take: 1,
        })

        let topCategory: { id: string | undefined; name: string | undefined; total: number } | null = null

        if (categoryAgg.length > 0 && categoryAgg[0].expenseCategoryId) {

            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: categoryAgg[0].expenseCategoryId! },
            })

            topCategory = {
                id: category?.id,
                name: category?.name,
                total: Number(categoryAgg[0]._sum.amount ?? 0),
            }
        }

        // MONTHLY TREND
        const startTrend = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

        const expenses = await this.prisma.expense.findMany({
            where: {
                restaurantId,
                date: {
                    gte: startTrend,
                },
                isActive: true,
            },
        })

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        const trendMap: Record<string, number> = {}

        expenses.forEach((e) => {
            const d = new Date(e.date)
            const key = `${d.getFullYear()}-${d.getMonth()}`
            trendMap[key] = (trendMap[key] || 0) + Number(e.amount)
        })

        const monthlyTrend: { month: string; total: number }[] = []

        for (let i = months - 1; i >= 0; i--) {

            const d = new Date()
            d.setMonth(d.getMonth() - i)

            const key = `${d.getFullYear()}-${d.getMonth()}`

            monthlyTrend.push({
                month: monthNames[d.getMonth()],
                total: trendMap[key] ?? 0
            })
        }

        return {
            total_expense_this_month: totalExpense,

            top_expense_category: topCategory,

            monthly_trend: monthlyTrend,
        }
    }

    async getExpensesOverTime(
        actor: User,
        restaurantId: string,
        startDate: string,
        endDate?: string,
        expenseType?: ExpenseType,
        expenseCategoryId?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        if (!startDate) {
            throw new BadRequestException('startDate is required');
        }

        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
            throw new BadRequestException('Invalid startDate format. Use YYYY-MM-DD');
        }
        start.setHours(0, 0, 0, 0);

        const end = endDate ? new Date(endDate) : new Date(start);
        if (Number.isNaN(end.getTime())) {
            throw new BadRequestException('Invalid endDate format. Use YYYY-MM-DD');
        }
        end.setHours(23, 59, 59, 999);

        if (end < start) {
            throw new BadRequestException('endDate cannot be before startDate');
        }

        const expenses = await this.prisma.expense.findMany({
            where: {
                restaurantId,
                isActive: true,
                date: {
                    gte: start,
                    lte: end,
                },
                ...(expenseType && { expenseType }),
                ...(expenseCategoryId && { expenseCategoryId }),
            },
            select: {
                date: true,
                amount: true,
            },
            orderBy: {
                date: 'asc',
            },
        });

        const byDate: Record<string, { total: number; count: number }> = {};

        expenses.forEach((expense) => {
            const dateKey = new Date(expense.date).toISOString().split('T')[0];
            if (!byDate[dateKey]) {
                byDate[dateKey] = { total: 0, count: 0 };
            }
            byDate[dateKey].total += Number(expense.amount);
            byDate[dateKey].count += 1;
        });

        const trend = Object.entries(byDate).map(([date, value]) => ({
            date,
            totalAmount: this.round2(value.total),
            expenseCount: value.count,
        }));

        const totalAmount = this.round2(
            expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
        );

        return {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            filters: {
                expenseType: expenseType || null,
                expenseCategoryId: expenseCategoryId || null,
            },
            totalAmount,
            totalExpenses: expenses.length,
            trend,
        };
    }

    // -----------Coupoun---------------------------------------

    async performance(
        actor: User,
        restaurantId: string,
        startYear?: number,
        endYear?: number
    ) {

        await this.assertRestaurantAccess(actor, restaurantId);

        const whereCoupon: any = { restaurantId };
        const whereUsage: any = { coupon: { restaurantId } };

        if (startYear || endYear) {

            const start = startYear
                ? new Date(startYear, 0, 1)
                : new Date(2000, 0, 1);

            const end = endYear
                ? new Date(endYear, 11, 31, 23, 59, 59)
                : new Date();

            whereCoupon.createdAt = { gte: start, lte: end };
            whereUsage.createdAt = { gte: start, lte: end };
        }

        const totalCoupons = await this.prisma.coupon.count({
            where: whereCoupon
        });

        const usages = await this.prisma.couponUsage.findMany({
            where: whereUsage,
            select: {
                discountAmount: true
            }
        });

        const totalDiscount = usages.reduce(
            (sum, u) => sum + Number(u.discountAmount),
            0
        );

        return {
            total_coupons: totalCoupons,
            total_discount_given: totalDiscount
        };
    }

    async usageTrend(
        actor: User,
        restaurantId: string,
        startYear?: number,
        endYear?: number
    ) {

        await this.assertRestaurantAccess(actor, restaurantId);

        const where: any = {
            coupon: { restaurantId }
        };

        if (startYear || endYear) {

            const start = startYear
                ? new Date(startYear, 0, 1)
                : new Date(2000, 0, 1);

            const end = endYear
                ? new Date(endYear, 11, 31, 23, 59, 59)
                : new Date();

            where.createdAt = {
                gte: start,
                lte: end
            };
        }

        const rows = await this.prisma.couponUsage.findMany({
            where,
            select: { createdAt: true }
        });

        const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        ];

        const trend: Record<string, number> = {};
        months.forEach(m => trend[m] = 0);

        rows.forEach(r => {
            const m = months[new Date(r.createdAt).getMonth()];
            trend[m]++;
        });

        return months.map(m => ({
            month: m,
            usage: trend[m]
        }));
    }

    // -----------Coupoun---------------------------------------


    async getMenuPerformance(
        actor: User,
        restaurantId: string,
        range: '7d' | '30d' | '90d',
        startDate?: string,
        endDate?: string,
    ) {
        const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
        let startDateObj = new Date();
        let endDateObj = new Date();
        if (startDate && endDate) {
            startDateObj = new Date(startDate);
            endDateObj = new Date(endDate);
            startDateObj.setHours(0, 0, 0, 0);
            endDateObj.setHours(23, 59, 59, 999);
        } else if (startDate && !endDate) {
            startDateObj = new Date(startDate);
            startDateObj.setHours(0, 0, 0, 0);
            endDateObj = new Date(startDate);
            endDateObj.setHours(23, 59, 59, 999);
        } else {
            startDateObj.setDate(startDateObj.getDate() - days);
        }
        const previousStart = new Date(startDateObj);
        previousStart.setDate(previousStart.getDate() - days);

        const previousPerformance = await this.prisma.billItem.groupBy({
            by: ['menuItemId'],
            where: {
                bill: {
                    restaurantId,
                    status: 'PAID',
                    OR: [
                        {
                            paidAt: {
                                gte: previousStart,
                                lt: startDateObj,
                            },
                        },
                        {
                            paidAt: null,
                            createdAt: {
                                gte: previousStart,
                                lt: startDateObj,
                            },
                        },
                    ],
                },
            },
            _sum: {
                quantity: true,
                totalPrice: true,
            },
        });

        const previousByItemId = new Map(
            previousPerformance.map((row) => [
                row.menuItemId,
                {
                    quantity: Number(row._sum.quantity || 0),
                    totalPrice: Number(row._sum.totalPrice || 0),
                },
            ]),
        );

        // Most Selling Item

        const mostSelling = await this.prisma.billItem.groupBy({
            by: ['menuItemId'],
            where: {
                bill: {
                    restaurantId,
                    status: 'PAID',
                    OR: [
                        {
                            paidAt: {
                                gte: startDateObj,
                                lte: endDateObj,
                            },
                        },
                        {
                            paidAt: null,
                            createdAt: {
                                gte: startDateObj,
                                lte: endDateObj,
                            },
                        },
                    ],
                },
            },
            _sum: {
                quantity: true,
            },
            orderBy: {
                _sum: {
                    quantity: 'desc',
                },
            },
            take: 1,
        });

        let mostSellingItem: any = null;

        if (mostSelling.length) {

            const item = await this.prisma.menuItem.findUnique({
                where: { id: mostSelling[0].menuItemId },
            });

            mostSellingItem = {
                name: item?.name,
                units_sold: mostSelling[0]._sum.quantity || 0,
                growth: this.pctChange(
                    previousByItemId.get(mostSelling[0].menuItemId)?.quantity || 0,
                    Number(mostSelling[0]._sum.quantity || 0),
                ),
            };
        }

        // Peak Hours

        const sessions = await this.prisma.orderSession.findMany({
            where: {
                restaurantId,
                createdAt: {
                    gte: startDateObj,
                    lte: endDateObj,
                },
            },
            select: {
                createdAt: true,
            },
        });

        const hourMap: Record<number, number> = {};

        sessions.forEach((s) => {
            const hour = new Date(s.createdAt).getHours();
            hourMap[hour] = (hourMap[hour] || 0) + 1;
        });

        let peakHour = 0;
        let peakCount = 0;

        Object.entries(hourMap).forEach(([hour, count]) => {
            if (count > peakCount) {
                peakHour = Number(hour);
                peakCount = count;
            }
        });

        const peakHours = {
            range: `${peakHour}:00 - ${peakHour + 1}:00`,
            avg_orders_per_hour: peakCount,
        };

        // Revenue

        const currentRevenue = await this.prisma.bill.aggregate({
            where: {
                restaurantId,
                status: 'PAID',
                OR: [
                    {
                        paidAt: {
                            gte: startDateObj,
                            lte: endDateObj,
                        },
                    },
                    {
                        paidAt: null,
                        createdAt: {
                            gte: startDateObj,
                            lte: endDateObj,
                        },
                    },
                ],
            },
            _sum: { totalAmount: true },
        });

        const previousRevenue = await this.prisma.bill.aggregate({
            where: {
                restaurantId,
                status: 'PAID',
                OR: [
                    {
                        paidAt: {
                            gte: previousStart,
                            lt: startDateObj,
                        },
                    },
                    {
                        paidAt: null,
                        createdAt: {
                            gte: previousStart,
                            lt: startDateObj,
                        },
                    },
                ],
            },
            _sum: { totalAmount: true },
        });

        const current = Number(currentRevenue._sum.totalAmount || 0);
        const previous = Number(previousRevenue._sum.totalAmount || 0);

        const growth =
            previous === 0 ? 100 : ((current - previous) / previous) * 100;

        const totalRevenue = {
            current,
            previous,
            growth: Number(growth.toFixed(2)),
        };

        // Menu Performance

        const performance = await this.prisma.billItem.groupBy({
            by: ['menuItemId'],
            where: {
                bill: {
                    restaurantId,
                    status: 'PAID',
                    OR: [
                        {
                            paidAt: {
                                gte: startDateObj,
                                lte: endDateObj,
                            },
                        },
                        {
                            paidAt: null,
                            createdAt: {
                                gte: startDateObj,
                                lte: endDateObj,
                            },
                        },
                    ],
                },
            },
            _sum: {
                quantity: true,
                totalPrice: true,
            },
        });

        const menuPerformance = await Promise.all(
            performance.map(async (item) => {

                const menu = await this.prisma.menuItem.findUnique({
                    where: { id: item.menuItemId },
                    include: { category: true },
                });

                return {
                    item_name: menu?.name,
                    category: menu?.category?.name,
                    units_sold: item._sum.quantity || 0,
                    total_revenue: Number(item._sum.totalPrice || 0),
                    growth_percentage: this.pctChange(
                        previousByItemId.get(item.menuItemId)?.totalPrice || 0,
                        Number(item._sum.totalPrice || 0),
                    ),
                };
            }),
        );

        // Popular Item Combinations

        const batches = await this.prisma.orderBatch.findMany({
            where: {
                session: {
                    restaurantId,
                    createdAt: {
                        gte: startDateObj,
                        lte: endDateObj,
                    },
                },
            },
            include: {
                items: {
                    include: { menuItem: true },
                },
            },
        });

        const comboMap: Record<string, number> = {};

        batches.forEach((batch) => {

            const items = batch.items.map((i) => i.menuItem.name);

            for (let i = 0; i < items.length; i++) {
                for (let j = i + 1; j < items.length; j++) {

                    const key = `${items[i]} + ${items[j]}`;
                    comboMap[key] = (comboMap[key] || 0) + 1;
                }
            }
        });

        const popularCombinations = Object.entries(comboMap)
            .map(([items, count]) => ({
                items,
                orders: count,
            }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        return {
            most_selling_item: mostSellingItem,
            peak_hours: peakHours,
            total_revenue: totalRevenue,
            popular_combinations: popularCombinations,
            menu_performance: menuPerformance,
        };
    }


    async getSalesTrend(
        actor: User,
        restaurantId: string,
        range: '7d' | '30d',
        startDate?: string,
        endDate?: string,
    ) {
        const days = range === '30d' ? 30 : 7;

        let startDateObj = new Date();
        let endDateObj = new Date();

        if (startDate && endDate) {
            startDateObj = new Date(startDate);
            endDateObj = new Date(endDate);

            startDateObj.setHours(0, 0, 0, 0);
            endDateObj.setHours(23, 59, 59, 999);
        } else if (startDate && !endDate) {
            startDateObj = new Date(startDate);
            endDateObj = new Date(startDate);

            startDateObj.setHours(0, 0, 0, 0);
            endDateObj.setHours(23, 59, 59, 999);
        } else {
            startDateObj.setDate(startDateObj.getDate() - days);
        }

        // Get all bills in range
        const bills = await this.prisma.bill.findMany({
            where: {
                restaurantId,
                status: 'PAID',
                OR: [
                    {
                        paidAt: {
                            gte: startDateObj,
                            lte: endDateObj,
                        },
                    },
                    {
                        paidAt: null,
                        createdAt: {
                            gte: startDateObj,
                            lte: endDateObj,
                        },
                    },
                ],
            },
            select: {
                id: true,
                createdAt: true,
                paidAt: true,
                totalAmount: true,
            },
        });

        const dateMap: Record<
            string,
            {
                total: number;
                billIds: string[];
            }
        > = {};

        bills.forEach((bill) => {
            const revenueDate = bill.paidAt ?? bill.createdAt;
            const date = new Date(revenueDate).toISOString().split('T')[0];

            if (!dateMap[date]) {
                dateMap[date] = {
                    total: 0,
                    billIds: [],
                };
            }

            dateMap[date].total += Number(bill.totalAmount || 0);
            dateMap[date].billIds.push(bill.id);
        });

        const trendData: Array<{
            date: string;
            day: string;
            daily_total: number;
            items: { item_id: string | undefined; name: string | undefined; revenue: number }[];
        }> = [];

        for (const date of Object.keys(dateMap).sort()) {
            const billIds = dateMap[date].billIds;

            const topItems = await this.prisma.billItem.groupBy({
                by: ['menuItemId'],
                where: {
                    billId: { in: billIds },
                },
                _sum: {
                    totalPrice: true,
                },
                orderBy: {
                    _sum: {
                        totalPrice: 'desc',
                    },
                },
                take: 3,
            });

            const items = await Promise.all(
                topItems.map(async (item) => {
                    const menu = await this.prisma.menuItem.findUnique({
                        where: { id: item.menuItemId },
                    });

                    return {
                        item_id: menu?.id,
                        name: menu?.name,
                        revenue: Number(item._sum.totalPrice || 0),
                    };
                }),
            );

            const dateObj = new Date(date);

            trendData.push({
                date,
                day: dateObj
                    .toLocaleDateString('en-US', { weekday: 'short' })
                    .toUpperCase(),
                daily_total: Number(dateMap[date].total.toFixed(2)),
                items,
            });
        }

        return {
            period: range === '30d' ? 'last_30_days' : 'last_7_days',
            trend_data: trendData,
        };
    }


    // ─── Waiter Analytics ───────────────────────────────────────────

    async getWaiterAnalytics(
        actor: User,
        restaurantId: string,
        date1: string,
        date2?: string,
        waiterId?: string,
        waiterName?: string,
        page = 1,
        limit = 10,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        if (!date1) {
            throw new Error('date1 is required');
        }

        const startDate = new Date(date1);
        startDate.setHours(0, 0, 0, 0);

        const endDate = date2 ? new Date(date2) : new Date(date1);
        endDate.setHours(23, 59, 59, 999);

        const waiters = await this.prisma.user.findMany({
            where: {
                restaurantId,
                role: UserRole.WAITER,
                ...(waiterId && { id: waiterId }),
                ...(waiterName && {
                    name: { contains: waiterName },
                }),
            },
            include: {
                openedSessions: {
                    where: {
                        restaurantId,
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    },
                    include: {
                        bill: true,
                    },
                },
            },
        });

        const result = waiters.map((waiter) => {
            const sessions = waiter.openedSessions;

            const totalSessions = sessions.length;

            const bills = sessions
                .map((s) => s.bill)
                .filter((b) => b !== null);

            const totalBills = bills.length;

            const totalRevenue = bills.reduce(
                (sum, b) => sum + Number(b!.totalAmount),
                0,
            );

            const avgOrderValue =
                totalBills > 0 ? totalRevenue / totalBills : 0;

            return {
                waiterId: waiter.id,
                waiterName: waiter.name,
                totalSessions,
                totalBills,
                totalRevenue: this.round2(totalRevenue),
                avgOrderValue: this.round2(avgOrderValue),
            };
        });

        result.sort((a, b) => b.totalRevenue - a.totalRevenue);

        const start = (page - 1) * limit;
        const paginated = result.slice(start, start + limit);

        return {
            total: result.length,
            page,
            limit,
            data: paginated,
        };
    }

    async getCustomerRetention(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const customers = await this.prisma.customer.findMany({
            where: { restaurantId, isActive: true },
            include: {
                orderSessions: {
                    select: { createdAt: true },
                },
            },
        });

        const totalCustomers = customers.length;

        let returningCustomers = 0;
        let churnedCustomers = 0;

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        customers.forEach((c) => {
            if (c.orderSessions.length > 1) returningCustomers++;

            const lastVisit = c.orderSessions
                .map((s) => s.createdAt)
                .sort((a, b) => b.getTime() - a.getTime())[0];

            if (!lastVisit || lastVisit < thirtyDaysAgo) churnedCustomers++;
        });

        return {
            totalCustomers,
            returningCustomers,
            retentionRate:
                totalCustomers > 0
                    ? Number(((returningCustomers / totalCustomers) * 100).toFixed(2))
                    : 0,
            churnedCustomers,
        };
    }


    async getAOV(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const [agg, count] = await Promise.all([
            this.prisma.bill.aggregate({
                where: { restaurantId, status: 'PAID' },
                _sum: { totalAmount: true },
            }),
            this.prisma.bill.count({
                where: { restaurantId, status: 'PAID' },
            }),
        ]);

        const totalRevenue = Number(agg._sum.totalAmount || 0);

        return {
            totalRevenue,
            totalOrders: count,
            averageOrderValue: count > 0 ? totalRevenue / count : 0,
        };
    }


    async getRevenueByChannel(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const sessions = await this.prisma.orderSession.findMany({
            where: { restaurantId },
            include: { bill: true },
        });

        const map: Record<string, number> = {};

        sessions.forEach((s) => {
            if (!s.bill || s.bill.status !== 'PAID') return;

            const channel = s.channel;
            map[channel] = (map[channel] || 0) + Number(s.bill.totalAmount);
        });

        return Object.entries(map).map(([channel, revenue]) => ({
            channel,
            revenue,
        }));
    }


    async getTopCustomers(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const bills = await this.prisma.bill.findMany({
            where: { restaurantId, status: BillStatus.PAID },
            include: { customer: true },
            orderBy: { createdAt: 'asc' },
        });

        const customers = await this.prisma.customer.findMany({
            where: { restaurantId },
            select: { id: true, name: true, email: true, phone: true },
        });

        const customerByPhone = new Map<string, { id: string; name: string | null }>();
        const customerByEmail = new Map<string, { id: string; name: string | null }>();

        for (const customer of customers) {
            if (customer.phone) {
                customerByPhone.set(customer.phone.trim(), {
                    id: customer.id,
                    name: customer.name,
                });
            }
            if (customer.email) {
                customerByEmail.set(customer.email.trim().toLowerCase(), {
                    id: customer.id,
                    name: customer.name,
                });
            }
        }

        const map: Record<string, any> = {};

        bills.forEach((b) => {
            const resolvedCustomer =
                (b.customerId && b.customer)
                    ? { id: b.customerId, name: b.customer.name ?? b.customerName ?? null }
                    : (b.customerPhone && customerByPhone.get(b.customerPhone.trim())) ||
                    (b.customerEmail && customerByEmail.get(b.customerEmail.trim().toLowerCase())) ||
                    null;

            const customerKey = resolvedCustomer?.id
                ? `customer:${resolvedCustomer.id}`
                : b.customerPhone
                    ? `phone:${b.customerPhone.trim()}`
                    : b.customerEmail
                        ? `email:${b.customerEmail.trim().toLowerCase()}`
                        : null;

            if (!customerKey) return;

            if (!map[customerKey]) {
                map[customerKey] = {
                    customerId: resolvedCustomer?.id ?? b.customerId ?? null,
                    name: resolvedCustomer?.name ?? b.customer?.name ?? b.customerName ?? null,
                    totalSpend: 0,
                    visitCount: 0,
                };
            }

            map[customerKey].totalSpend += Number(b.totalAmount);
            map[customerKey].visitCount += 1;
        });

        return Object.values(map)
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .slice(0, 10);
    }

    async getOrderTimeDistribution(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const sessions = await this.prisma.orderSession.findMany({
            where: { restaurantId },
            select: { createdAt: true },
        });

        const map: Record<number, number> = {};

        sessions.forEach((s) => {
            const hour = new Date(s.createdAt).getHours();
            map[hour] = (map[hour] || 0) + 1;
        });

        return Object.entries(map).map(([hour, count]) => ({
            hour: `${hour}:00`,
            orders: count,
        }));
    }

    async getPreparationTimeAnalytics(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const items = await this.prisma.orderItem.findMany({
            where: {
                batch: {
                    is: {
                        session: {
                            is: {
                                restaurantId,
                            },
                        },
                    },
                },
                preparedAt: { not: null },
            },
            include: {
                menuItem: true,
                batch: {
                    include: {
                        session: true,
                    },
                },
            },
        });

        const map: Record<string, { totalTime: number; count: number; name: string }> = {};

        items.forEach((i) => {
            const createdAt = i.createdAt;
            const preparedAt = i.preparedAt;

            if (!preparedAt) return;

            const diff = (new Date(preparedAt).getTime() - new Date(createdAt).getTime()) / 60000; // mins

            if (!map[i.menuItemId]) {
                map[i.menuItemId] = {
                    totalTime: 0,
                    count: 0,
                    name: i.menuItem?.name || 'Unknown',
                };
            }

            map[i.menuItemId].totalTime += diff;
            map[i.menuItemId].count += 1;
        });

        return Object.values(map).map((item) => ({
            itemName: item.name,
            avgPrepTimeMins:
                item.count > 0 ? Number((item.totalTime / item.count).toFixed(2)) : 0,
        }));
    }

    async getKitchenBottlenecks(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const items = await this.prisma.orderItem.findMany({
            where: {
                preparedAt: { not: null },
                batch: {
                    is: {
                        session: {
                            is: {
                                restaurantId,
                            },
                        },
                    },
                },
            },
            include: { menuItem: true },
        });

        if (!items.length) {
            return { slowest_items: [], peak_kitchen_hours: [] };
        }

        const map: Record<string, { total: number; count: number; name: string }> = {};

        items.forEach((i) => {
            const diff =
                (new Date(i.preparedAt!).getTime() - new Date(i.createdAt).getTime()) /
                60000;

            if (!map[i.menuItemId]) {
                map[i.menuItemId] = {
                    total: 0,
                    count: 0,
                    name: i.menuItem?.name || 'Unknown',
                };
            }

            map[i.menuItemId].total += diff;
            map[i.menuItemId].count++;
        });

        const slowest_items = Object.values(map)
            .map((i) => ({
                itemName: i.name,
                avgPrepTime: i.total / i.count,
            }))
            .sort((a, b) => b.avgPrepTime - a.avgPrepTime)
            .slice(0, 5);

        // Peak hours (same as before)
        const sessions = await this.prisma.orderSession.findMany({
            where: { restaurantId },
            select: { createdAt: true },
        });

        const hourMap: Record<number, number> = {};

        sessions.forEach((s) => {
            const h = new Date(s.createdAt).getHours();
            hourMap[h] = (hourMap[h] || 0) + 1;
        });

        const peak_kitchen_hours = Object.entries(hourMap)
            .map(([h, c]) => ({ hour: `${h}:00`, orders: c }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        return { slowest_items, peak_kitchen_hours };
    }


    async getOrderFulfillmentTime(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const items = await this.prisma.orderItem.findMany({
            where: {
                servedAt: { not: null },
                batch: {
                    is: {
                        session: {
                            is: {
                                restaurantId,
                            },
                        },
                    },
                },
            },
        });
        console.log('Items with servedAt:', items.length);
        if (!items.length) {
            return {
                avgFulfillmentTimeMins: 0,
                totalOrders: 0,
            };
        }

        let total = 0;

        items.forEach((i) => {
            total +=
                (new Date(i.servedAt!).getTime() - new Date(i.createdAt).getTime()) /
                60000;
        });
        console.log('Total fulfillment time (mins):', total);
        return {
            avgFulfillmentTimeMins: Number((total / items.length).toFixed(2)),
            totalOrders: items.length,
        };
    }
}


