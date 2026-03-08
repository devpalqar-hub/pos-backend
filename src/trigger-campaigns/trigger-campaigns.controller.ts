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
import { TriggerCampaignsService } from './trigger-campaigns.service';
import { CreateTriggerCampaignDto } from './dto/create-trigger-campaign.dto';
import { UpdateTriggerCampaignDto } from './dto/update-trigger-campaign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole, TriggerCampaignStatus } from '@prisma/client';

@ApiTags('Marketing — Trigger Campaigns')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/marketing/trigger-campaigns')
export class TriggerCampaignsController {
    constructor(private readonly service: TriggerCampaignsService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Create an automated trigger campaign',
        description: `
Creates a rule-based trigger campaign that automatically sends marketing messages
to customers when specified conditions are met.

### Trigger Rules
Configure one or more rules with AND/OR logic. Each rule is optional — the campaign
can use a single rule or combine multiple:

| Condition | Value format | Description |
|-----------|-------------|-------------|
| VISITED_IN_DATE_RANGE | JSON \`{"startDate":"2026-03-01","endDate":"2026-03-31"}\` | Customer visited within a date range |
| VISITED_ON_DAY | \`MONDAY\` or \`MONDAY,FRIDAY\` | Customer visited on specific day(s) |
| ORDERED_ITEMS | JSON \`["menuItemId1","menuItemId2"]\` | Customer ordered from a specific item list |
| HAS_PENDING_LOYALTY | Number (min points) or omit for any | Customer has pending loyalty points |
| MIN_VISIT_COUNT | Number | Customer visited at least N times |
| MIN_SPEND_AMOUNT | Number | Customer spent at least X in total |

### Repeat Configuration
- \`repeatDelayDays\` — Minimum days between repeated triggers per customer (default: 1)
- \`maxTriggersPerCustomer\` — Max times to trigger per customer (null = unlimited)
- \`expiresAt\` — Campaign auto-stops after this date

### Content
Same as regular campaigns: supports \`{{name}}\`, \`{{restaurant}}\`, \`{{imageUrl}}\` placeholders.

### Channels
Select one or more: \`EMAIL\`, \`SMS\`, \`WHATSAPP\`.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiResponse({ status: 201, description: 'Trigger campaign created.' })
    @ApiResponse({ status: 400, description: 'Validation error or missing channel credentials.' })
    async create(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateTriggerCampaignDto,
    ) {
        return {
            message: 'Trigger campaign created successfully',
            data: await this.service.create(actor, restaurantId, dto),
        };
    }

    // ─── List ─────────────────────────────────────────────────────────────────

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, enum: TriggerCampaignStatus })
    @ApiQuery({ name: 'search', required: false, type: String })
    @ApiOperation({ summary: 'List trigger campaigns (paginated)' })
    @ApiResponse({ status: 200, description: 'Trigger campaign list returned.' })
    async findAll(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: TriggerCampaignStatus,
        @Query('search') search?: string,
    ) {
        return {
            message: 'Trigger campaigns fetched successfully',
            ...(await this.service.findAll(
                actor,
                restaurantId,
                parseInt(page ?? '1'),
                parseInt(limit ?? '10'),
                status,
                search,
            )),
        };
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    @Get(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Trigger Campaign UUID' })
    @ApiOperation({ summary: 'Get a trigger campaign with rules and channels' })
    @ApiResponse({ status: 200, description: 'Trigger campaign returned.' })
    @ApiResponse({ status: 404, description: 'Trigger campaign not found.' })
    async findOne(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Trigger campaign fetched successfully',
            data: await this.service.findOne(actor, restaurantId, id),
        };
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    @Patch(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Trigger Campaign UUID' })
    @ApiOperation({
        summary: 'Update a trigger campaign',
        description: 'Cannot edit EXPIRED trigger campaigns.',
    })
    @ApiResponse({ status: 200, description: 'Trigger campaign updated.' })
    @ApiResponse({ status: 400, description: 'Campaign is EXPIRED.' })
    @ApiResponse({ status: 404, description: 'Trigger campaign not found.' })
    async update(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTriggerCampaignDto,
    ) {
        return {
            message: 'Trigger campaign updated successfully',
            data: await this.service.update(actor, restaurantId, id, dto),
        };
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    @Delete(':id')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Trigger Campaign UUID' })
    @ApiOperation({ summary: 'Delete (soft-delete) a trigger campaign' })
    @ApiResponse({ status: 200, description: 'Trigger campaign deleted.' })
    @ApiResponse({ status: 404, description: 'Trigger campaign not found.' })
    async remove(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.service.remove(actor, restaurantId, id);
    }

    // ─── Pause ────────────────────────────────────────────────────────────────

    @Post(':id/pause')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Trigger Campaign UUID' })
    @ApiOperation({
        summary: 'Pause an active trigger campaign',
        description: 'Stops the campaign from evaluating triggers until resumed.',
    })
    @ApiResponse({ status: 200, description: 'Trigger campaign paused.' })
    @ApiResponse({ status: 400, description: 'Campaign is not ACTIVE.' })
    async pause(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.service.pause(actor, restaurantId, id);
    }

    // ─── Resume ───────────────────────────────────────────────────────────────

    @Post(':id/resume')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Trigger Campaign UUID' })
    @ApiOperation({
        summary: 'Resume a paused trigger campaign',
        description: 'Reactivates the campaign. Cannot resume if expired.',
    })
    @ApiResponse({ status: 200, description: 'Trigger campaign resumed.' })
    @ApiResponse({ status: 400, description: 'Campaign is not PAUSED or has expired.' })
    async resume(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.service.resume(actor, restaurantId, id);
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

    @Get(':id/analytics')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'id', description: 'Trigger Campaign UUID' })
    @ApiOperation({
        summary: 'Get trigger campaign analytics',
        description: `
Returns analytics for the trigger campaign:
- Total messages sent across all triggers
- Unique customers reached
- Sent/failed breakdown
- Last 200 log entries with customer details
    `,
    })
    @ApiResponse({ status: 200, description: 'Analytics returned.' })
    @ApiResponse({ status: 404, description: 'Trigger campaign not found.' })
    async analytics(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Trigger campaign analytics fetched successfully',
            data: await this.service.getAnalytics(actor, restaurantId, id),
        };
    }
}
