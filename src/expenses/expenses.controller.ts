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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole, ExpenseType } from '@prisma/client';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/expenses')
export class ExpensesController {
    constructor(private readonly expensesService: ExpensesService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create an expense',
        description: 'Create a new expense entry for the restaurant.',
    })
    @ApiResponse({ status: 201, description: 'Expense created.' })
    @ApiResponse({ status: 400, description: 'Validation error.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async create(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateExpenseDto,
    ) {
        return {
            message: 'Expense created successfully',
            data: await this.expensesService.create(actor, restaurantId, dto),
        };
    }

    // ─── List All ─────────────────────────────────────────────────────────────

    @Get()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiQuery({
        name: 'expenseType',
        required: false,
        enum: ExpenseType,
        description: 'Filter by expense type (DAILY, WEEKLY, MONTHLY, YEARLY)',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search expenses by name or description',
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Filter expenses from this date (ISO 8601)',
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'Filter expenses up to this date (ISO 8601)',
    })
    @ApiOperation({
        summary: 'List expenses for a restaurant',
        description:
            'Returns paginated expenses ordered by date (newest first). ' +
            'Optionally filter by `expenseType`, `search`, and date range.',
    })
    @ApiResponse({ status: 200, description: 'Expenses returned.' })
    @ApiResponse({ status: 403, description: 'Not assigned to this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async findAll(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('expenseType') expenseType?: ExpenseType,
        @Query('search') search?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const pageNum = parseInt(page ?? '1');
        const limitNum = parseInt(limit ?? '10');

        const data = await this.expensesService.findAll(
            actor,
            restaurantId,
            pageNum,
            limitNum,
            expenseType,
            search,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );

        return {
            message: 'Expenses fetched successfully',
            data,
        };
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    @Get(':id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Expense UUID' })
    @ApiOperation({
        summary: 'Get a single expense by ID',
        description: 'Returns full expense details.',
    })
    @ApiResponse({ status: 200, description: 'Expense found.' })
    @ApiResponse({ status: 404, description: 'Expense or restaurant not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Expense fetched successfully',
            data: await this.expensesService.findOne(actor, restaurantId, id),
        };
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Expense UUID' })
    @ApiOperation({
        summary: 'Update an expense',
        description: 'Update expense name, type, amount, description, or date.',
    })
    @ApiResponse({ status: 200, description: 'Expense updated.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Expense or restaurant not found.' })
    async update(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateExpenseDto,
    ) {
        return {
            message: 'Expense updated successfully',
            data: await this.expensesService.update(actor, restaurantId, id, dto),
        };
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Expense UUID' })
    @ApiOperation({
        summary: 'Delete an expense (soft delete)',
        description: 'Marks the expense as inactive. Only admins and above can delete.',
    })
    @ApiResponse({ status: 200, description: 'Expense deleted.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Expense or restaurant not found.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return await this.expensesService.remove(actor, restaurantId, id);
    }
}
