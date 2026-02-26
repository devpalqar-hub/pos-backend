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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/customers')
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create a customer',
        description: `
Creates a new customer for the specified restaurant. Phone numbers are **unique per restaurant**.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiResponse({ status: 201, description: 'Customer created.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    @ApiResponse({ status: 409, description: 'Phone already exists in this restaurant.' })
    async create(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateCustomerDto,
    ) {
        return {
            message: 'Customer created successfully',
            data: await this.customersService.create(actor, restaurantId, dto),
        };
    }

    // ─── List ─────────────────────────────────────────────────────────────────

    @Get()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or phone' })
    @ApiOperation({
        summary: 'List all customers for a restaurant',
        description:
            'Returns all customers ordered by creation date (newest first). ' +
            'Supports pagination and search by name or phone.',
    })
    @ApiResponse({ status: 200, description: 'Customer list returned.' })
    @ApiResponse({ status: 403, description: 'Not assigned to this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async findAll(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('search') search?: string,
    ) {
        return {
            message: 'Customers fetched successfully',
            data: await this.customersService.findAll(
                actor,
                restaurantId,
                parseInt(page ?? '1'),
                parseInt(limit ?? '10'),
                search,
            ),
        };
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    @Get(':id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiOperation({
        summary: 'Get a customer by ID',
        description: 'Returns the customer details including recent loyalty point redemptions.',
    })
    @ApiResponse({ status: 200, description: 'Customer found.' })
    @ApiResponse({ status: 404, description: 'Customer or restaurant not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Customer fetched successfully',
            data: await this.customersService.findOne(actor, restaurantId, id),
        };
    }

    // ─── Get by Phone ─────────────────────────────────────────────────────────

    @Get('phone/:phone')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'phone', description: 'Customer phone number' })
    @ApiOperation({
        summary: 'Get a customer by phone number',
        description:
            'Returns the customer details (including wallet balance) by phone number. ' +
            'Useful for looking up loyalty points wallet.',
    })
    @ApiResponse({ status: 200, description: 'Customer found.' })
    @ApiResponse({ status: 404, description: 'Customer not found.' })
    async findByPhone(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('phone') phone: string,
    ) {
        return {
            message: 'Customer fetched successfully',
            data: await this.customersService.findByPhone(actor, restaurantId, phone),
        };
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiOperation({
        summary: 'Update a customer',
        description: 'Updates customer details. Phone uniqueness is enforced.',
    })
    @ApiResponse({ status: 200, description: 'Customer updated.' })
    @ApiResponse({ status: 404, description: 'Customer not found.' })
    @ApiResponse({ status: 409, description: 'Phone already exists in this restaurant.' })
    async update(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCustomerDto,
    ) {
        return {
            message: 'Customer updated successfully',
            data: await this.customersService.update(actor, restaurantId, id, dto),
        };
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Customer UUID' })
    @ApiOperation({
        summary: 'Delete a customer',
        description: 'Permanently removes a customer from the restaurant.',
    })
    @ApiResponse({ status: 200, description: 'Customer deleted.' })
    @ApiResponse({ status: 404, description: 'Customer not found.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return await this.customersService.remove(actor, restaurantId, id);
    }
}
