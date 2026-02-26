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
import { LoyalityPointsService } from './loyality-points.service';
import { CreateLoyalityPointDto } from './dto/create-loyality-point.dto';
import { UpdateLoyalityPointDto } from './dto/update-loyality-point.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Loyality Points')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/loyality-points')
export class LoyalityPointsController {
    constructor(
        private readonly loyalityPointsService: LoyalityPointsService,
    ) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create a loyalty point rule',
        description: `
Creates a new loyalty point rule for the specified restaurant.  
All time/date/day fields are optional. When omitted the rule applies unconditionally.

- **maxUsagePerCustomer**: max redemptions per customer (null = unlimited)

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiResponse({ status: 201, description: 'Loyalty point rule created.' })
    @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async create(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateLoyalityPointDto,
    ) {
        return {
            message: 'Loyalty point rule created successfully',
            data: await this.loyalityPointsService.create(
                actor,
                restaurantId,
                dto,
            ),
        };
    }

    // ─── List ─────────────────────────────────────────────────────────────────

    @Get()
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiOperation({
        summary: 'List all loyalty point rules for a restaurant',
        description:
            'Returns all loyalty point rules ordered by creation date (newest first), with pagination.',
    })
    @ApiResponse({ status: 200, description: 'Loyalty point list returned.' })
    @ApiResponse({ status: 403, description: 'Not assigned to this restaurant.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async findAll(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return {
            message: 'Loyalty point rules fetched successfully',
            data: await this.loyalityPointsService.findAll(
                actor,
                restaurantId,
                parseInt(page ?? '1'),
                parseInt(limit ?? '10'),
            ),
        };
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    @Get(':id')
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Loyalty point rule UUID' })
    @ApiOperation({
        summary: 'Get a loyalty point rule by ID',
        description:
            'Returns the loyalty point rule details.',
    })
    @ApiResponse({ status: 200, description: 'Loyalty point rule found.' })
    @ApiResponse({ status: 404, description: 'Rule or restaurant not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Loyalty point rule fetched successfully',
            data: await this.loyalityPointsService.findOne(
                actor,
                restaurantId,
                id,
            ),
        };
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Loyalty point rule UUID' })
    @ApiOperation({
        summary: 'Update a loyalty point rule',
        description:
            'Updates loyalty point rule details.',
    })
    @ApiResponse({ status: 200, description: 'Loyalty point rule updated.' })
    @ApiResponse({ status: 404, description: 'Rule not found.' })
    async update(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateLoyalityPointDto,
    ) {
        return {
            message: 'Loyalty point rule updated successfully',
            data: await this.loyalityPointsService.update(
                actor,
                restaurantId,
                id,
                dto,
            ),
        };
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Loyalty point rule UUID' })
    @ApiOperation({
        summary: 'Delete a loyalty point rule',
        description: 'Permanently removes a loyalty point rule and all its associations.',
    })
    @ApiResponse({ status: 200, description: 'Rule deleted.' })
    @ApiResponse({ status: 404, description: 'Rule not found.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return await this.loyalityPointsService.remove(actor, restaurantId, id);
    }
}
