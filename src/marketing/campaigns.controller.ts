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
import { MarketingService } from './marketing.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TriggerCampaignDto } from './dto/trigger-campaign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole, CampaignStatus } from '@prisma/client';

@ApiTags('Marketing — Campaigns')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/marketing/campaigns')
export class CampaignsController {
  constructor(private readonly marketingService: MarketingService) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Create a new campaign',
    description: `
Creates a marketing campaign for the restaurant.

### Content
- \`subject\` — Email subject line (supports \`{{name}}\` and \`{{restaurant}}\` placeholders)
- \`textContent\` — Plain text body for SMS / WhatsApp and the plain-text email fallback
- \`htmlContent\` — Full HTML email body. If omitted, a default responsive template is rendered automatically.
  - To embed the promo image: \`<img src="{{imageUrl}}" />\`
- \`imageUrl\` — Upload via \`POST /upload/image\` then paste the URL here

### Template variables
| Variable | Replaced with |
|----------|--------------|
| \`{{name}}\` | Customer's name (or "Customer" if unknown) |
| \`{{restaurant}}\` | Restaurant name |
| \`{{imageUrl}}\` | Value of \`imageUrl\` field |

### Channels
Select one or more: \`EMAIL\`, \`SMS\`, \`WHATSAPP\`.
The channel's credentials must be configured in Settings before triggering.

### Targeting rules
\`rules\` is optional — leave empty to target **all customers**.
Each rule has a \`condition\` and a \`value\`:
| Condition | value |
|----------|-------|
| ALL_CUSTOMERS | — |
| MIN_ORDERS | minimum order count |
| MAX_ORDERS | maximum order count |
| MIN_SPEND | minimum lifetime spend (restaurant currency) |
| MAX_SPEND | maximum lifetime spend |
| LAST_ORDER_WITHIN_DAYS | number of days (e.g. \`30\`) |
| ORDER_CHANNEL | \`DINE_IN\` \\| \`ONLINE_OWN\` \\| \`UBER_EATS\` |
| MIN_LOYALTY_POINTS | minimum total loyalty points earned |

\`ruleOperator\` determines how multiple rules combine: \`AND\` (all must match) or \`OR\` (any match).

### Scheduling
- Set \`scheduledAt\` to a future ISO-8601 datetime to auto-schedule the campaign.
- Leave blank to save as DRAFT and manually trigger later via the \`/trigger\` endpoint.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
  })
  @ApiResponse({ status: 201, description: 'Campaign created.' })
  @ApiResponse({ status: 400, description: 'Validation error or missing channel credentials.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async create(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: CreateCampaignDto,
  ) {
    return {
      message: 'Campaign created successfully',
      data: await this.marketingService.createCampaign(actor, restaurantId, dto),
    };
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CampaignStatus,
    description: 'Filter by campaign status',
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or description' })
  @ApiOperation({ summary: 'List all campaigns (paginated)' })
  @ApiResponse({ status: 200, description: 'Campaign list returned.' })
  async findAll(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: CampaignStatus,
    @Query('search') search?: string,
  ) {
    return {
      message: 'Campaigns fetched successfully',
      ...(await this.marketingService.findAllCampaigns(
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
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiOperation({ summary: 'Get a campaign with its rules and channel config' })
  @ApiResponse({ status: 200, description: 'Campaign returned.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async findOne(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      message: 'Campaign fetched successfully',
      data: await this.marketingService.findOneCampaign(actor, restaurantId, id),
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiOperation({
    summary: 'Update a campaign',
    description:
      'Update content, rules, channels, or schedule. ' +
      'Only DRAFT, SCHEDULED, or PAUSED campaigns can be edited.',
  })
  @ApiResponse({ status: 200, description: 'Campaign updated.' })
  @ApiResponse({ status: 400, description: 'Campaign status does not allow editing.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async update(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return {
      message: 'Campaign updated successfully',
      data: await this.marketingService.updateCampaign(actor, restaurantId, id, dto),
    };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiOperation({
    summary: 'Delete (soft-delete) a campaign',
    description: 'Cannot delete a RUNNING campaign — pause it first.',
  })
  @ApiResponse({ status: 200, description: 'Campaign deleted.' })
  @ApiResponse({ status: 400, description: 'Campaign is currently RUNNING.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async remove(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marketingService.deleteCampaign(actor, restaurantId, id);
  }

  // ─── Trigger ──────────────────────────────────────────────────────────────

  @Post(':id/trigger')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiOperation({
    summary: 'Trigger or re-trigger a campaign',
    description: `
Sends the campaign immediately or schedules it for a future time.

- **Immediate send**: call with an empty body (or omit \`scheduledAt\`).
- **Schedule**: provide a future \`scheduledAt\` ISO-8601 datetime — the campaign will be auto-triggered by the background scheduler.
- **Re-trigger**: can be called on COMPLETED or CANCELLED campaigns to re-send to the current matching audience.

The HTTP response returns immediately; actual sending happens asynchronously in the background.
    `,
  })
  @ApiResponse({ status: 200, description: 'Campaign triggered or scheduled.' })
  @ApiResponse({ status: 400, description: 'Campaign already running or scheduledAt is in the past.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async trigger(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TriggerCampaignDto,
  ) {
    return this.marketingService.triggerCampaign(actor, restaurantId, id, dto);
  }

  // ─── Pause ────────────────────────────────────────────────────────────────

  @Post(':id/pause')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiOperation({
    summary: 'Pause a running or scheduled campaign',
    description:
      'Pauses a RUNNING campaign (stops further sending) or a SCHEDULED campaign (prevents it from auto-triggering). ' +
      'Resume by calling `/trigger` again.',
  })
  @ApiResponse({ status: 200, description: 'Campaign paused.' })
  @ApiResponse({ status: 400, description: 'Campaign is not RUNNING or SCHEDULED.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async pause(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.marketingService.pauseCampaign(actor, restaurantId, id);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  @ApiOperation({
    summary: 'Get campaign analytics',
    description: `
Returns detailed delivery analytics for the campaign:
- Overall counters (totalRecipients, sent, delivered, failed, pending, deliveryRate)
- Per-channel breakdown
- Last 200 recipient rows with delivery status
    `,
  })
  @ApiResponse({ status: 200, description: 'Analytics returned.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async analytics(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      message: 'Campaign analytics fetched successfully',
      data: await this.marketingService.getCampaignAnalytics(actor, restaurantId, id),
    };
  }
}
