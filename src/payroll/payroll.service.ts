import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import {
    CreateStaffProfileDto,
    UpdateStaffProfileDto,
    MarkLeaveDto,
    BulkMarkLeaveDto,
    AddOvertimeDto,
    ProcessPayrollDto,
} from './dto';
import { User, UserRole, DayOfWeek, LeaveType } from '@prisma/client';

/** Reusable include for Staff queries — always includes working days */
const STAFF_INCLUDE = {
    workingDays: true,
} as const;

@Injectable()
export class PayrollService {
    constructor(private readonly prisma: PrismaService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    //  STAFF PROFILE CRUD
    // ═══════════════════════════════════════════════════════════════════════════

    async createStaffProfile(actor: User, restaurantId: string, dto: CreateStaffProfileDto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        // Check if a staff member with this email already exists
        const existing = await this.prisma.staff.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException(
                `A staff member with email "${dto.email}" already exists`,
            );
        }

        return this.prisma.staff.create({
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone ?? null,
                jobRole: dto.jobRole ?? null,
                restaurantId,
                monthlySalary: dto.monthlySalary,
                paidLeaveDays: dto.paidLeaveDays,
                dailyWorkHours: dto.dailyWorkHours,
                createdById: actor.id,
                workingDays: {
                    create: dto.workingDays.map((day) => ({ day })),
                },
            },
            include: STAFF_INCLUDE,
        });
    }

    async findAllStaffProfiles(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        search?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const where: any = {
            isActive: true,
            restaurantId,
            ...(search && {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                ],
            }),
        };

        return paginate({
            prismaModel: this.prisma.staff,
            page,
            limit,
            where,
            include: STAFF_INCLUDE,
            orderBy: [{ createdAt: 'desc' }],
        });
    }

    async findOneStaffProfile(actor: User, restaurantId: string, staffProfileId: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const profile = await this.prisma.staff.findFirst({
            where: {
                id: staffProfileId,
                isActive: true,
                restaurantId,
            },
            include: STAFF_INCLUDE,
        });

        if (!profile) {
            throw new NotFoundException(
                `Staff profile ${staffProfileId} not found in restaurant ${restaurantId}`,
            );
        }

        return profile;
    }

    async updateStaffProfile(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        dto: UpdateStaffProfileDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const profile = await this.prisma.staff.findFirst({
            where: {
                id: staffProfileId,
                isActive: true,
                restaurantId,
            },
        });
        if (!profile) {
            throw new NotFoundException(
                `Staff profile ${staffProfileId} not found in restaurant ${restaurantId}`,
            );
        }

        // Update working days if provided
        if (dto.workingDays) {
            await this.prisma.staffWorkingDay.deleteMany({ where: { staffId: staffProfileId } });
            await this.prisma.staffWorkingDay.createMany({
                data: dto.workingDays.map((day) => ({ staffId: staffProfileId, day })),
            });
        }

        return this.prisma.staff.update({
            where: { id: staffProfileId },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.email !== undefined && { email: dto.email }),
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.jobRole !== undefined && { jobRole: dto.jobRole }),
                ...(dto.monthlySalary !== undefined && { monthlySalary: dto.monthlySalary }),
                ...(dto.paidLeaveDays !== undefined && { paidLeaveDays: dto.paidLeaveDays }),
                ...(dto.dailyWorkHours !== undefined && { dailyWorkHours: dto.dailyWorkHours }),
            },
            include: STAFF_INCLUDE,
        });
    }

    async removeStaffProfile(actor: User, restaurantId: string, staffProfileId: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        this.assertAdminOrAbove(actor);

        const profile = await this.prisma.staff.findFirst({
            where: {
                id: staffProfileId,
                restaurantId,
            },
        });
        if (!profile) {
            throw new NotFoundException(
                `Staff profile ${staffProfileId} not found in restaurant ${restaurantId}`,
            );
        }

        await this.prisma.staff.update({
            where: { id: staffProfileId },
            data: { isActive: false },
        });

        return { message: `Payroll profile for "${profile.name}" deleted successfully` };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  LEAVE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    async markLeave(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        dto: MarkLeaveDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const profile = await this.getActiveProfile(restaurantId, staffProfileId);

        // Check if leave already exists for this date
        const existingLeave = await this.prisma.staffLeave.findUnique({
            where: { staffId_date: { staffId: staffProfileId, date: dto.date } },
        });
        if (existingLeave) {
            throw new ConflictException(
                `Leave already marked for ${dto.date.toISOString().split('T')[0]}`,
            );
        }

        // Use explicit leave type if provided, otherwise auto-detect
        const leaveType = dto.leaveType
            ?? await this.determineLeaveType(
                staffProfileId,
                profile.paidLeaveDays,
                dto.date,
            );

        return this.prisma.staffLeave.create({
            data: {
                staffId: staffProfileId,
                date: dto.date,
                leaveType,
                reason: dto.reason ?? null,
            },
        });
    }

    async bulkMarkLeave(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        dto: BulkMarkLeaveDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const profile = await this.getActiveProfile(restaurantId, staffProfileId);
        const results: any[] = [];

        for (const date of dto.dates) {
            const existing = await this.prisma.staffLeave.findUnique({
                where: { staffId_date: { staffId: staffProfileId, date } },
            });
            if (existing) {
                results.push({ date, status: 'already_exists', leave: existing });
                continue;
            }

            const leaveType = dto.leaveType
                ?? await this.determineLeaveType(
                    staffProfileId,
                    profile.paidLeaveDays,
                    date,
                );

            const leave = await this.prisma.staffLeave.create({
                data: {
                    staffId: staffProfileId,
                    date,
                    leaveType,
                    reason: dto.reason ?? null,
                },
            });
            results.push({ date, status: 'created', leave });
        }

        return results;
    }

    async getLeaves(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        month?: number,
        year?: number,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        await this.getActiveProfile(restaurantId, staffProfileId);

        const where: any = { staffId: staffProfileId };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        }

        const leaves = await this.prisma.staffLeave.findMany({
            where,
            orderBy: { date: 'asc' },
        });

        const paidCount = leaves.filter((l) => l.leaveType === LeaveType.PAID).length;
        const unpaidCount = leaves.filter((l) => l.leaveType === LeaveType.UNPAID).length;

        return {
            leaves,
            summary: {
                totalLeaves: leaves.length,
                paidLeaves: paidCount,
                unpaidLeaves: unpaidCount,
            },
        };
    }

    async removeLeave(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        leaveId: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        await this.getActiveProfile(restaurantId, staffProfileId);

        const leave = await this.prisma.staffLeave.findFirst({
            where: { id: leaveId, staffId: staffProfileId },
        });
        if (!leave) {
            throw new NotFoundException(`Leave ${leaveId} not found`);
        }

        await this.prisma.staffLeave.delete({ where: { id: leaveId } });

        return { message: 'Leave removed successfully' };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  OVERTIME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    async addOvertime(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        dto: AddOvertimeDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        await this.getActiveProfile(restaurantId, staffProfileId);

        return this.prisma.staffOvertime.create({
            data: {
                staffId: staffProfileId,
                date: dto.date,
                hours: dto.hours,
                wageAmount: dto.wageAmount,
                notes: dto.notes ?? null,
            },
        });
    }

    async getOvertimes(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        month?: number,
        year?: number,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');
        await this.getActiveProfile(restaurantId, staffProfileId);

        const where: any = { staffId: staffProfileId };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);
            where.date = { gte: startDate, lte: endDate };
        }

        const overtimes = await this.prisma.staffOvertime.findMany({
            where,
            orderBy: { date: 'asc' },
        });

        const totalHours = overtimes.reduce((sum, ot) => sum + Number(ot.hours), 0);
        const totalWage = overtimes.reduce((sum, ot) => sum + Number(ot.wageAmount), 0);

        return {
            overtimes,
            summary: {
                totalEntries: overtimes.length,
                totalHours,
                totalWage,
            },
        };
    }

    async removeOvertime(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        overtimeId: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        await this.getActiveProfile(restaurantId, staffProfileId);

        const overtime = await this.prisma.staffOvertime.findFirst({
            where: { id: overtimeId, staffId: staffProfileId },
        });
        if (!overtime) {
            throw new NotFoundException(`Overtime ${overtimeId} not found`);
        }

        await this.prisma.staffOvertime.delete({ where: { id: overtimeId } });

        return { message: 'Overtime entry removed successfully' };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SALARY PROCESSING
    // ═══════════════════════════════════════════════════════════════════════════

    async processSalary(
        actor: User,
        restaurantId: string,
        staffProfileId: string,
        dto: ProcessPayrollDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const profile = await this.prisma.staff.findFirst({
            where: {
                id: staffProfileId,
                isActive: true,
                restaurantId,
            },
            include: STAFF_INCLUDE,
        });
        if (!profile) {
            throw new NotFoundException(
                `Staff profile ${staffProfileId} not found in restaurant ${restaurantId}`,
            );
        }

        // Check if payroll already processed for this month
        const existingPayroll = await this.prisma.payroll.findUnique({
            where: {
                staffId_month_year: {
                    staffId: staffProfileId,
                    month: dto.month,
                    year: dto.year,
                },
            },
        });
        if (existingPayroll) {
            throw new ConflictException(
                `Payroll for ${dto.month}/${dto.year} already processed for this staff member`,
            );
        }

        // Calculate total working days in the month based on staff's working days config
        const totalWorkingDays = this.calculateWorkingDaysInMonth(
            dto.year,
            dto.month,
            profile.workingDays.map((wd) => wd.day),
        );

        if (totalWorkingDays === 0) {
            throw new BadRequestException(
                'No working days configured for this staff member in the given month',
            );
        }

        const monthlySalary = Number(profile.monthlySalary);
        const perDaySalary = monthlySalary / totalWorkingDays;

        // Get leaves for the month
        const startDate = new Date(dto.year, dto.month - 1, 1);
        const endDate = new Date(dto.year, dto.month, 0, 23, 59, 59);

        const leaves = await this.prisma.staffLeave.findMany({
            where: {
                staffId: staffProfileId,
                date: { gte: startDate, lte: endDate },
            },
        });

        const paidLeaveDays = leaves.filter((l) => l.leaveType === LeaveType.PAID).length;
        const unpaidLeaveDays = leaves.filter((l) => l.leaveType === LeaveType.UNPAID).length;

        // Get overtime for the month
        const overtimes = await this.prisma.staffOvertime.findMany({
            where: {
                staffId: staffProfileId,
                date: { gte: startDate, lte: endDate },
            },
        });
        const overtimeAmount = overtimes.reduce((sum, ot) => sum + Number(ot.wageAmount), 0);

        // Calculate deductions and additions
        const bonusAmount = dto.bonusAmount ?? 0;
        const deductionAmount = dto.deductionAmount ?? 0;

        const unpaidLeaveDeduction = unpaidLeaveDays * perDaySalary;
        const totalDeductions = unpaidLeaveDeduction + deductionAmount;
        const totalAdditions = overtimeAmount + bonusAmount;

        const finalSalary = monthlySalary - totalDeductions + totalAdditions;

        // Create payroll record
        const payroll = await this.prisma.payroll.create({
            data: {
                restaurantId,
                staffId: staffProfileId,
                month: dto.month,
                year: dto.year,
                monthlySalary,
                totalWorkingDays,
                perDaySalary: Math.round(perDaySalary * 100) / 100,
                paidLeaveDays,
                unpaidLeaveDays,
                overtimeAmount,
                bonusAmount,
                deductionAmount,
                deductionNotes: dto.deductionNotes ?? null,
                totalDeductions: Math.round(totalDeductions * 100) / 100,
                totalAdditions: Math.round(totalAdditions * 100) / 100,
                finalSalary: Math.round(finalSalary * 100) / 100,
                status: 'PROCESSED',
                processedAt: new Date(),
                notes: dto.notes ?? null,
                createdById: actor.id,
            },
            include: {
                staff: { include: STAFF_INCLUDE },
            },
        });

        return {
            payroll,
            breakdown: {
                monthlySalary,
                totalWorkingDays,
                perDaySalary: Math.round(perDaySalary * 100) / 100,
                paidLeaveDays,
                unpaidLeaveDays,
                unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction * 100) / 100,
                overtimeAmount,
                bonusAmount,
                deductionAmount,
                totalDeductions: Math.round(totalDeductions * 100) / 100,
                totalAdditions: Math.round(totalAdditions * 100) / 100,
                finalSalary: Math.round(finalSalary * 100) / 100,
            },
        };
    }

    async getPayrolls(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        month?: number,
        year?: number,
        staffProfileId?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const where: any = {
            restaurantId,
            ...(month && { month }),
            ...(year && { year }),
            ...(staffProfileId && { staffId: staffProfileId }),
        };

        return paginate({
            prismaModel: this.prisma.payroll,
            page,
            limit,
            where,
            include: {
                staff: { include: STAFF_INCLUDE },
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        });
    }

    async getPayrollById(actor: User, restaurantId: string, payrollId: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const payroll = await this.prisma.payroll.findFirst({
            where: { id: payrollId, restaurantId },
            include: {
                staff: { include: STAFF_INCLUDE },
            },
        });

        if (!payroll) {
            throw new NotFoundException(
                `Payroll ${payrollId} not found in restaurant ${restaurantId}`,
            );
        }

        return payroll;
    }

    async markPayrollPaid(actor: User, restaurantId: string, payrollId: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const payroll = await this.prisma.payroll.findFirst({
            where: { id: payrollId, restaurantId },
        });

        if (!payroll) {
            throw new NotFoundException(
                `Payroll ${payrollId} not found in restaurant ${restaurantId}`,
            );
        }

        if (payroll.status === 'PAID') {
            throw new ConflictException('Payroll is already marked as paid');
        }

        return this.prisma.payroll.update({
            where: { id: payrollId },
            data: { status: 'PAID' },
            include: {
                staff: { include: STAFF_INCLUDE },
            },
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Calculates the number of working days in a given month
     * based on the staff's configured working days.
     */
    private calculateWorkingDaysInMonth(
        year: number,
        month: number,
        workingDays: DayOfWeek[],
    ): number {
        const dayMap: Record<number, DayOfWeek> = {
            0: DayOfWeek.SUNDAY,
            1: DayOfWeek.MONDAY,
            2: DayOfWeek.TUESDAY,
            3: DayOfWeek.WEDNESDAY,
            4: DayOfWeek.THURSDAY,
            5: DayOfWeek.FRIDAY,
            6: DayOfWeek.SATURDAY,
        };

        let count = 0;
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = dayMap[date.getDay()];
            if (workingDays.includes(dayOfWeek)) {
                count++;
            }
        }

        return count;
    }

    /**
     * Determines whether a leave should be PAID or UNPAID
     * based on the monthly paid leave allowance already consumed.
     */
    private async determineLeaveType(
        staffProfileId: string,
        allowedPaidLeaves: number,
        date: Date,
    ): Promise<LeaveType> {
        const month = date.getMonth(); // 0-indexed
        const year = date.getFullYear();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const paidLeavesThisMonth = await this.prisma.staffLeave.count({
            where: {
                staffId: staffProfileId,
                leaveType: LeaveType.PAID,
                date: { gte: startDate, lte: endDate },
            },
        });

        return paidLeavesThisMonth < allowedPaidLeaves
            ? LeaveType.PAID
            : LeaveType.UNPAID;
    }

    /**
     * Fetches an active staff profile within a restaurant (via user.restaurantId).
     */
    private async getActiveProfile(restaurantId: string, staffProfileId: string) {
        const profile = await this.prisma.staff.findFirst({
            where: {
                id: staffProfileId,
                isActive: true,
                restaurantId,
            },
        });
        if (!profile) {
            throw new NotFoundException(
                `Staff profile ${staffProfileId} not found in restaurant ${restaurantId}`,
            );
        }
        return profile;
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
        if (!restaurant) {
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);
        }

        if (actor.role === UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new ForbiddenException('You do not own this restaurant');
            }
            return;
        }

        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException('You are not assigned to this restaurant');
        }

        if (
            mode === 'manage' &&
            (actor.role === UserRole.WAITER ||
                actor.role === UserRole.CHEF ||
                actor.role === UserRole.BILLER)
        ) {
            throw new ForbiddenException(
                'WAITER, CHEF and BILLER can only view payroll data, not manage it',
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
                'Insufficient permissions to perform this action',
            );
        }
    }
}
