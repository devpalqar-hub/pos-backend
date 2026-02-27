import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
    UseGuards,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import {
    CreateStaffProfileDto,
    UpdateStaffProfileDto,
    MarkLeaveDto,
    BulkMarkLeaveDto,
    AddOvertimeDto,
    ProcessPayrollDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/payroll')
export class PayrollController {
    constructor(private readonly payrollService: PayrollService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    //  STAFF PROFILE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── Create Staff Profile ─────────────────────────────────────────────────

    @Post('staff')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create a staff member with payroll profile',
        description:
            'Creates a new staff member with name, email, salary, paid leave, ' +
            'working hours, and working days configuration.',
    })
    @ApiResponse({ status: 201, description: 'Staff profile created.' })
    @ApiResponse({ status: 400, description: 'Validation error or user not in restaurant.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 409, description: 'Profile already exists for this user.' })
    async createStaffProfile(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateStaffProfileDto,
    ) {
        return {
            message: 'Staff profile created successfully',
            data: await this.payrollService.createStaffProfile(actor, restaurantId, dto),
        };
    }

    // ─── List Staff Profiles ──────────────────────────────────────────────────

    @Get('staff')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by user name or email' })
    @ApiOperation({
        summary: 'List all staff payroll profiles',
        description: 'Returns paginated staff profiles with user info and working days. Supports search.',
    })
    @ApiResponse({ status: 200, description: 'Staff profiles returned.' })
    async findAllStaffProfiles(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return {
            message: 'Staff profiles fetched successfully',
            data: await this.payrollService.findAllStaffProfiles(
                actor,
                restaurantId,
                parseInt(page ?? '1'),
                parseInt(limit ?? '10'),
                search,
            ),
        };
    }

    // ─── Get One Staff Profile ────────────────────────────────────────────────

    @Get('staff/:staffProfileId')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Get a staff payroll profile by ID',
        description: 'Returns full profile details including user info and working days.',
    })
    @ApiResponse({ status: 200, description: 'Staff profile found.' })
    @ApiResponse({ status: 404, description: 'Staff profile not found.' })
    async findOneStaffProfile(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
    ) {
        return {
            message: 'Staff profile fetched successfully',
            data: await this.payrollService.findOneStaffProfile(actor, restaurantId, staffProfileId),
        };
    }

    // ─── Update Staff Profile ─────────────────────────────────────────────────

    @Patch('staff/:staffProfileId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Update a staff payroll profile',
        description: 'Update salary, paid leave, working hours, or working days.',
    })
    @ApiResponse({ status: 200, description: 'Staff profile updated.' })
    @ApiResponse({ status: 404, description: 'Staff profile not found.' })
    async updateStaffProfile(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Body() dto: UpdateStaffProfileDto,
    ) {
        return {
            message: 'Staff profile updated successfully',
            data: await this.payrollService.updateStaffProfile(actor, restaurantId, staffProfileId, dto),
        };
    }

    // ─── Delete Staff Profile ─────────────────────────────────────────────────

    @Delete('staff/:staffProfileId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Delete a staff payroll profile (soft delete)',
        description: 'Marks the staff profile as inactive.',
    })
    @ApiResponse({ status: 200, description: 'Staff profile deleted.' })
    @ApiResponse({ status: 404, description: 'Staff profile not found.' })
    async removeStaffProfile(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
    ) {
        return await this.payrollService.removeStaffProfile(actor, restaurantId, staffProfileId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  LEAVE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── Mark Leave ───────────────────────────────────────────────────────────

    @Post('staff/:staffProfileId/leaves')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Mark a single leave day',
        description:
            'Marks a leave day for the staff member. Automatically determines if it is ' +
            'paid or unpaid based on the monthly paid leave allowance.',
    })
    @ApiResponse({ status: 201, description: 'Leave marked.' })
    @ApiResponse({ status: 409, description: 'Leave already exists for this date.' })
    async markLeave(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Body() dto: MarkLeaveDto,
    ) {
        return {
            message: 'Leave marked successfully',
            data: await this.payrollService.markLeave(actor, restaurantId, staffProfileId, dto),
        };
    }

    // ─── Bulk Mark Leave ──────────────────────────────────────────────────────

    @Post('staff/:staffProfileId/leaves/bulk')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Mark multiple leave days at once',
        description: 'Marks multiple leave days. Skips dates with existing leaves.',
    })
    @ApiResponse({ status: 201, description: 'Leaves marked.' })
    async bulkMarkLeave(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Body() dto: BulkMarkLeaveDto,
    ) {
        return {
            message: 'Leaves marked successfully',
            data: await this.payrollService.bulkMarkLeave(actor, restaurantId, staffProfileId, dto),
        };
    }

    // ─── Get Leaves ───────────────────────────────────────────────────────────

    @Get('staff/:staffProfileId/leaves')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month (1–12)' })
    @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
    @ApiOperation({
        summary: 'Get leaves for a staff member',
        description:
            'Returns all leaves with a summary of paid and unpaid leaves. ' +
            'Optionally filter by month and year.',
    })
    @ApiResponse({ status: 200, description: 'Leaves returned.' })
    async getLeaves(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        return {
            message: 'Leaves fetched successfully',
            data: await this.payrollService.getLeaves(
                actor,
                restaurantId,
                staffProfileId,
                month ? parseInt(month) : undefined,
                year ? parseInt(year) : undefined,
            ),
        };
    }

    // ─── Remove Leave ─────────────────────────────────────────────────────────

    @Delete('staff/:staffProfileId/leaves/:leaveId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiParam({ name: 'leaveId', description: 'Leave UUID' })
    @ApiOperation({
        summary: 'Remove a leave entry',
        description: 'Deletes a leave entry for the staff member.',
    })
    @ApiResponse({ status: 200, description: 'Leave removed.' })
    @ApiResponse({ status: 404, description: 'Leave not found.' })
    async removeLeave(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Param('leaveId', ParseUUIDPipe) leaveId: string,
    ) {
        return await this.payrollService.removeLeave(actor, restaurantId, staffProfileId, leaveId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  OVERTIME MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── Add Overtime ─────────────────────────────────────────────────────────

    @Post('staff/:staffProfileId/overtimes')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Add an overtime entry',
        description:
            'Records overtime hours and wage amount for the staff member on a specific date.',
    })
    @ApiResponse({ status: 201, description: 'Overtime added.' })
    async addOvertime(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Body() dto: AddOvertimeDto,
    ) {
        return {
            message: 'Overtime entry added successfully',
            data: await this.payrollService.addOvertime(actor, restaurantId, staffProfileId, dto),
        };
    }

    // ─── Get Overtimes ────────────────────────────────────────────────────────

    @Get('staff/:staffProfileId/overtimes')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month (1–12)' })
    @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
    @ApiOperation({
        summary: 'Get overtime entries for a staff member',
        description:
            'Returns all overtime entries with a summary of total hours and wages. ' +
            'Optionally filter by month and year.',
    })
    @ApiResponse({ status: 200, description: 'Overtimes returned.' })
    async getOvertimes(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
    ) {
        return {
            message: 'Overtimes fetched successfully',
            data: await this.payrollService.getOvertimes(
                actor,
                restaurantId,
                staffProfileId,
                month ? parseInt(month) : undefined,
                year ? parseInt(year) : undefined,
            ),
        };
    }

    // ─── Remove Overtime ──────────────────────────────────────────────────────

    @Delete('staff/:staffProfileId/overtimes/:overtimeId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiParam({ name: 'overtimeId', description: 'Overtime UUID' })
    @ApiOperation({
        summary: 'Remove an overtime entry',
        description: 'Deletes an overtime entry for the staff member.',
    })
    @ApiResponse({ status: 200, description: 'Overtime removed.' })
    @ApiResponse({ status: 404, description: 'Overtime not found.' })
    async removeOvertime(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Param('overtimeId', ParseUUIDPipe) overtimeId: string,
    ) {
        return await this.payrollService.removeOvertime(actor, restaurantId, staffProfileId, overtimeId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SALARY PROCESSING
    // ═══════════════════════════════════════════════════════════════════════════

    // ─── Process Salary ───────────────────────────────────────────────────────

    @Post('staff/:staffProfileId/process')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'staffProfileId', description: 'Staff Profile UUID' })
    @ApiOperation({
        summary: 'Process monthly salary for a staff member',
        description:
            'Calculates the final salary based on monthly base salary, working days, ' +
            'paid/unpaid leaves, overtime earnings, bonuses, and deductions. ' +
            'Returns a detailed salary breakdown.',
    })
    @ApiResponse({ status: 201, description: 'Salary processed.' })
    @ApiResponse({ status: 409, description: 'Payroll already processed for this month.' })
    async processSalary(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('staffProfileId', ParseUUIDPipe) staffProfileId: string,
        @Body() dto: ProcessPayrollDto,
    ) {
        return {
            message: 'Salary processed successfully',
            data: await this.payrollService.processSalary(actor, restaurantId, staffProfileId, dto),
        };
    }

    // ─── List Payrolls ────────────────────────────────────────────────────────

    @Get('payrolls')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiQuery({ name: 'month', required: false, type: Number, description: 'Filter by month (1–12)' })
    @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filter by year' })
    @ApiQuery({ name: 'staffProfileId', required: false, type: String, description: 'Filter by staff profile UUID' })
    @ApiOperation({
        summary: 'List all payroll records for a restaurant',
        description: 'Returns paginated payroll records. Filter by month, year, or staff profile.',
    })
    @ApiResponse({ status: 200, description: 'Payrolls returned.' })
    async getPayrolls(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('month') month?: string,
        @Query('year') year?: string,
        @Query('staffProfileId') staffProfileId?: string,
    ) {
        return {
            message: 'Payrolls fetched successfully',
            data: await this.payrollService.getPayrolls(
                actor,
                restaurantId,
                parseInt(page ?? '1'),
                parseInt(limit ?? '10'),
                month ? parseInt(month) : undefined,
                year ? parseInt(year) : undefined,
                staffProfileId,
            ),
        };
    }

    // ─── Get Payroll by ID ────────────────────────────────────────────────────

    @Get('payrolls/:payrollId')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'payrollId', description: 'Payroll UUID' })
    @ApiOperation({
        summary: 'Get a single payroll record',
        description: 'Returns full payroll details including staff and user information.',
    })
    @ApiResponse({ status: 200, description: 'Payroll found.' })
    @ApiResponse({ status: 404, description: 'Payroll not found.' })
    async getPayrollById(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('payrollId', ParseUUIDPipe) payrollId: string,
    ) {
        return {
            message: 'Payroll fetched successfully',
            data: await this.payrollService.getPayrollById(actor, restaurantId, payrollId),
        };
    }

    // ─── Mark Payroll as Paid ─────────────────────────────────────────────────

    @Patch('payrolls/:payrollId/paid')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'payrollId', description: 'Payroll UUID' })
    @ApiOperation({
        summary: 'Mark a payroll as paid',
        description: 'Updates the payroll status from PROCESSED to PAID.',
    })
    @ApiResponse({ status: 200, description: 'Payroll marked as paid.' })
    @ApiResponse({ status: 409, description: 'Already paid.' })
    async markPayrollPaid(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('payrollId', ParseUUIDPipe) payrollId: string,
    ) {
        return {
            message: 'Payroll marked as paid successfully',
            data: await this.payrollService.markPayrollPaid(actor, restaurantId, payrollId),
        };
    }
}
