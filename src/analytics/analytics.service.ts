import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole, BillStatus, PayrollStatus, DayOfWeek } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Profit & Loss ───────────────────────────────────────────────────────

    async getProfitAndLoss(
        actor: User,
        restaurantId: string | null,
        period: 'last30' | 'quarterly' | 'yearly',
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
                paidAt: { gte: start, lte: end },
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

    private getDateRanges(period: 'last30' | 'quarterly' | 'yearly') {
        const now = new Date();
        let currentStart: Date;
        let currentEnd: Date;
        let previousStart: Date;
        let previousEnd: Date;

        switch (period) {
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

        // 3. Total unique members across all programs
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
            totalMembers,
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

    // ─── Restaurant Access Helper ─────────────────────────────────────────────

    private async assertRestaurantAccess(
        actor: User,
        restaurantId: string,
    ): Promise<void> {
        if (actor.role === UserRole.SUPER_ADMIN) return;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        if (actor.role === UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id)
                throw new ForbiddenException('You do not own this restaurant');
            return;
        }

        if (actor.restaurantId !== restaurantId)
            throw new ForbiddenException('You are not assigned to this restaurant');
    }
}
