import {
    Controller,
    Get,
    Put,
    Delete,
    Post,
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
import { UberEatsService } from './uber-eats.service';
import { UpsertUberEatsSettingsDto } from './dto/upsert-settings.dto';
import { CreateUberEatsItemMappingDto } from './dto/create-item-mapping.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Uber Eats Integration')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/uber-eats')
export class UberEatsSettingsController {
    constructor(private readonly uberEatsService: UberEatsService) { }

    // ─── Settings ─────────────────────────────────────────────────────────────

    @Get('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Get Uber Eats integration settings',
        description: `
Returns the Uber Eats API credentials and configuration for this restaurant.
Sensitive fields (\`clientSecret\`, \`webhookSecret\`) are masked as \`••••••••\`.

Also returns the \`webhookUrl\` you should register in the Uber Eats Developer Dashboard.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiResponse({ status: 200, description: 'Settings returned.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async getSettings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return {
            message: 'Uber Eats settings fetched successfully',
            data: await this.uberEatsService.getSettings(actor, restaurantId),
        };
    }

    @Put('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Save / update Uber Eats integration settings',
        description: `
Creates or updates the Uber Eats API configuration for this restaurant.

### How to set up Uber Eats integration

1. Log in to the [Uber Eats Developer Dashboard](https://developer.uber.com)
2. Create an application and note your **Client ID** and **Client Secret**
3. Save these credentials here
4. Register the webhook endpoint shown in \`webhookUrl\` in the Uber developer dashboard
5. Copy the **Webhook Signing Secret** from the dashboard and save it here as \`webhookSecret\`
6. Add item mappings (see \`POST /item-mappings\`) so incoming Uber Eats items resolve to your POS menu items

### Field reference
| Field | Where to find it |
|---|---|
| \`clientId\` | Uber Developer Dashboard → App Credentials → Client ID |
| \`clientSecret\` | Uber Developer Dashboard → App Credentials → Client Secret |
| \`webhookSecret\` | Uber Developer Dashboard → Webhooks → Signing Secret |
| \`storeId\` | Uber Eats Restaurant Manager → Store Settings → Restaurant ID |

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiResponse({ status: 200, description: 'Settings saved.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    async upsertSettings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: UpsertUberEatsSettingsDto,
    ) {
        return {
            message: 'Uber Eats settings saved successfully',
            data: await this.uberEatsService.upsertSettings(actor, restaurantId, dto),
        };
    }

    @Delete('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Remove Uber Eats integration',
        description:
            'Deletes all Uber Eats settings and item mappings for this restaurant. ' +
            'Existing OrderSessions created from Uber Eats webhooks are preserved.',
    })
    @ApiResponse({ status: 200, description: 'Integration removed.' })
    @ApiResponse({ status: 404, description: 'Settings not found.' })
    async deleteSettings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return this.uberEatsService.deleteSettings(actor, restaurantId);
    }

    // ─── Item Mappings ────────────────────────────────────────────────────────

    @Get('item-mappings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'List Uber Eats → POS item mappings',
        description:
            'Returns all item mappings that link Uber Eats catalogue items to local POS menu items. ' +
            'Unresolved items in incoming webhooks are skipped and logged — add mappings here to fix them.',
    })
    @ApiResponse({ status: 200, description: 'Item mappings returned.' })
    async listItemMappings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return {
            message: 'Item mappings fetched successfully',
            data: await this.uberEatsService.listItemMappings(actor, restaurantId),
        };
    }

    @Post('item-mappings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Add an Uber Eats → POS item mapping',
        description: `
Maps an Uber Eats catalogue item to a local POS menu item, so webhook orders resolve correctly.

**Resolution priority** (highest to lowest):
1. Exact match on \`uberEatsItemId\`
2. Case-insensitive match on \`uberEatsItemName\` in existing mappings
3. Case-insensitive name match directly in your restaurant menu (auto-fallback, no mapping needed)

Supply at least one of \`uberEatsItemId\` or \`uberEatsItemName\`.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
    })
    @ApiResponse({ status: 201, description: 'Item mapping created.' })
    @ApiResponse({ status: 400, description: 'Validation error or duplicate mapping.' })
    @ApiResponse({ status: 404, description: 'Menu item or settings not found.' })
    async createItemMapping(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateUberEatsItemMappingDto,
    ) {
        return {
            message: 'Item mapping created successfully',
            data: await this.uberEatsService.createItemMapping(actor, restaurantId, dto),
        };
    }

    @Delete('item-mappings/:mappingId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'mappingId', description: 'Item mapping UUID' })
    @ApiOperation({ summary: 'Delete an Uber Eats → POS item mapping' })
    @ApiResponse({ status: 200, description: 'Mapping deleted.' })
    @ApiResponse({ status: 404, description: 'Mapping not found.' })
    async deleteItemMapping(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('mappingId', ParseUUIDPipe) mappingId: string,
    ) {
        return this.uberEatsService.deleteItemMapping(actor, restaurantId, mappingId);
    }

    // ─── Webhook Logs ─────────────────────────────────────────────────────────

    @Get('webhook-logs')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiOperation({
        summary: 'List Uber Eats webhook event logs',
        description:
            'Returns a paginated list of all received Uber Eats webhook events for debugging / auditing. ' +
            'The raw payload is excluded from the list — fetch individual logs for the full payload.',
    })
    @ApiResponse({ status: 200, description: 'Logs returned.' })
    async getWebhookLogs(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return {
            message: 'Webhook logs fetched successfully',
            ...(await this.uberEatsService.getWebhookLogs(
                actor,
                restaurantId,
                parseInt(page ?? '1'),
                parseInt(limit ?? '20'),
            )),
        };
    }

    @Get('webhook-logs/:logId')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiParam({ name: 'logId', description: 'Webhook log UUID' })
    @ApiOperation({
        summary: 'Get a single webhook event log with full raw payload',
    })
    @ApiResponse({ status: 200, description: 'Log returned.' })
    @ApiResponse({ status: 404, description: 'Log not found.' })
    async getWebhookLog(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Param('logId', ParseUUIDPipe) logId: string,
    ) {
        return {
            message: 'Webhook log fetched successfully',
            data: await this.uberEatsService.getWebhookLog(actor, restaurantId, logId),
        };
    }
}
