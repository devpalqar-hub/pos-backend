import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AssignStaffDto, RemoveStaffDto } from './dto/assign-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../../generated/prisma';

@ApiTags('Restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants')
export class RestaurantsController {
    constructor(private readonly restaurantsService: RestaurantsService) { }

    // ─── Create Restaurant ────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Create a new restaurant',
        description: `
**SUPER_ADMIN only.**

Creates a restaurant and immediately assigns it to an existing **OWNER** user.
Optionally supply the full weekly working hours schedule in the same request.

**Slug**: Auto-generated from the restaurant name if not provided. Must be globally unique.
    `,
    })
    @ApiResponse({ status: 201, description: 'Restaurant created successfully.' })
    @ApiResponse({ status: 400, description: 'Validation error or target user is not an OWNER.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Owner user not found.' })
    @ApiResponse({ status: 409, description: 'Slug already in use.' })
    async create(@CurrentUser() actor: User, @Body() dto: CreateRestaurantDto) {
        return {
            message: 'Restaurant created successfully',
            data: await this.restaurantsService.create(actor, dto),
        };
    }

    // ─── List Restaurants ─────────────────────────────────────────────────────

    @Get()
    @ApiOperation({
        summary: 'List restaurants',
        description: `
Returns restaurants visible to the authenticated user:

| Role | Visible restaurants |
|------|-------------------|
| SUPER_ADMIN | All restaurants |
| OWNER | Only their own restaurants |
| RESTAURANT_ADMIN / WAITER / CHEF | Only their assigned restaurant |
    `,
    })
    @ApiResponse({ status: 200, description: 'Restaurant list returned.' })
    async findAll(@CurrentUser() actor: User) {
        return {
            message: 'Restaurants fetched successfully',
            data: await this.restaurantsService.findAll(actor),
        };
    }

    // ─── Get Single Restaurant ────────────────────────────────────────────────

    @Get(':id')
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Get a restaurant by ID',
        description:
            'Returns full restaurant details including working hours and staff count. ' +
            'Internal metadata (createdBy) is hidden from non-admin roles.',
    })
    @ApiResponse({ status: 200, description: 'Restaurant found.' })
    @ApiResponse({ status: 403, description: 'Access denied.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Restaurant fetched successfully',
            data: await this.restaurantsService.findOne(actor, id),
        };
    }

    // ─── Update Restaurant ────────────────────────────────────────────────────

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Update restaurant details',
        description: `
**Role-based update rules:**
- **SUPER_ADMIN**: Can update any field, including \`ownerId\` (ownership transfer) and \`isActive\`
- **OWNER**: Can update all fields of their own restaurants except \`ownerId\`; can toggle \`isActive\`
- **RESTAURANT_ADMIN**: Can update basic info (name, contact, address, description, branding, working hours) in their assigned restaurant

Working hours are **upserted** — supplying days overwrites those days, unmentioned days are left unchanged.
    `,
    })
    @ApiResponse({ status: 200, description: 'Restaurant updated.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    @ApiResponse({ status: 409, description: 'Slug already in use.' })
    async update(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRestaurantDto,
    ) {
        return {
            message: 'Restaurant updated successfully',
            data: await this.restaurantsService.update(actor, id, dto),
        };
    }

    // ─── Delete Restaurant ────────────────────────────────────────────────────

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Delete a restaurant',
        description:
            '**SUPER_ADMIN only.** ' +
            'Deletes the restaurant and automatically unassigns all staff members. ' +
            'Working hours are cascade-deleted.',
    })
    @ApiResponse({ status: 200, description: 'Restaurant deleted.' })
    @ApiResponse({ status: 403, description: 'Only Super Admin can delete restaurants.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.restaurantsService.remove(actor, id);
    }

    // ─── Staff Management ─────────────────────────────────────────────────────

    @Get(':id/staff')
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'List staff assigned to a restaurant',
        description:
            'Returns all users (RESTAURANT_ADMIN, WAITER, CHEF) assigned to this restaurant.',
    })
    @ApiResponse({ status: 200, description: 'Staff list returned.' })
    @ApiResponse({ status: 403, description: 'Access denied.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async getStaff(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Staff fetched successfully',
            data: await this.restaurantsService.getStaff(actor, id),
        };
    }

    @Post(':id/staff/assign')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Assign a user to this restaurant',
        description: `
Assigns an existing user to this restaurant by setting their \`restaurantId\`.

**Rules:**
- **SUPER_ADMIN**: Can assign any staff user to any restaurant
- **OWNER**: Can assign staff to their own restaurants only
- **RESTAURANT_ADMIN**: Can assign WAITER/CHEF to their own restaurant only
- Cannot assign SUPER_ADMIN or OWNER roles as restaurant staff
    `,
    })
    @ApiResponse({ status: 200, description: 'User assigned to restaurant.' })
    @ApiResponse({ status: 400, description: 'Cannot assign SUPER_ADMIN/OWNER as staff.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant or user not found.' })
    async assignStaff(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AssignStaffDto,
    ) {
        return this.restaurantsService.assignStaff(actor, id, dto);
    }

    @Post(':id/staff/remove')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Remove a user from this restaurant',
        description:
            'Unassigns a user from this restaurant (sets their restaurantId to null). ' +
            'The user account is NOT deleted.',
    })
    @ApiResponse({ status: 200, description: 'User removed from restaurant.' })
    @ApiResponse({ status: 400, description: 'User is not assigned to this restaurant.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant or user not found.' })
    async removeStaff(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RemoveStaffDto,
    ) {
        return this.restaurantsService.removeStaff(actor, id, dto);
    }

    // ─── Working Hours ────────────────────────────────────────────────────────

    @Get(':id/working-hours')
    @ApiParam({ name: 'id', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Get working hours for a restaurant',
        description:
            'Returns the weekly working hours schedule, ordered by day of week. ' +
            'Accessible by all roles that can view the restaurant.',
    })
    @ApiResponse({ status: 200, description: 'Working hours returned.' })
    @ApiResponse({ status: 403, description: 'Access denied.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async getWorkingHours(
        @CurrentUser() actor: User,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Working hours fetched successfully',
            data: await this.restaurantsService.getWorkingHours(actor, id),
        };
    }
}
