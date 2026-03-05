import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { UpsertMarketingSettingsDto } from './dto/upsert-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Marketing — Settings')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/marketing/settings')
export class MarketingSettingsController {
  constructor(private readonly marketingService: MarketingService) {}

  // ─── Get Settings ─────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Get marketing channel settings',
    description: `
Returns the current SMTP, Twilio SMS, and WhatsApp Business API configuration for this restaurant.

**Sensitive fields** (passwords / tokens) are masked as \`••••••••\` in the response.
A \`configured: true\` flag indicates that the channel has enough credentials to send.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
  })
  @ApiResponse({ status: 200, description: 'Settings returned (sensitive fields masked).' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async getSettings(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return {
      message: 'Marketing settings fetched successfully',
      data: await this.marketingService.getSettings(actor, restaurantId),
    };
  }

  // ─── Upsert Settings ──────────────────────────────────────────────────────

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Save / update marketing channel settings',
    description: `
Creates or updates the SMTP, Twilio SMS, and WhatsApp Business API credentials for this restaurant.

You may send only the fields you want to update — unset fields are left unchanged.
Sending the masked value \`••••••••\` for a password / token field will **not** overwrite the stored value.

### SMTP
Standard SMTP credentials (Gmail App Password, SendGrid SMTP, etc.).

### Twilio SMS
Obtain the **Account SID** and **Auth Token** from [console.twilio.com](https://console.twilio.com).
\`twilioFromNumber\` must be in E.164 format, e.g. \`+15551234567\`.

### WhatsApp Business (Meta Cloud API)
- \`waBaId\` — WhatsApp Business Account ID (from Meta Business Manager)
- \`waPhoneNumberId\` — Phone Number ID for the sending number
- \`waAccessToken\` — Permanent / temporary access token from Meta Developers console

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
  })
  @ApiResponse({ status: 200, description: 'Settings saved. Returns updated (masked) settings.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async upsertSettings(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: UpsertMarketingSettingsDto,
  ) {
    return {
      message: 'Marketing settings saved successfully',
      data: await this.marketingService.upsertSettings(actor, restaurantId, dto),
    };
  }
}
