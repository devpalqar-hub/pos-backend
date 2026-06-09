import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Put,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { User, UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpsertStripeSettingsDto } from './dto/upsert-stripe-settings.dto';
import { StripeService } from './stripe.service';

@ApiTags('Stripe Integration')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/stripe')
export class StripeSettingsController {
    constructor(private readonly stripeService: StripeService) {}

    // ─── GET settings ────────────────────────────────────────────────────────

    @Get('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({ summary: 'Get Stripe integration settings for a restaurant' })
    @ApiResponse({ status: 200, description: 'Stripe settings returned (secret key masked).' })
    @ApiResponse({ status: 404, description: 'No Stripe settings configured yet.' })
    async getSettings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return {
            message: 'Stripe settings fetched successfully',
            data: await this.stripeService.getSettings(actor, restaurantId),
        };
    }

    // ─── PUT (upsert) settings ────────────────────────────────────────────────

    @Put('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({
        summary: 'Save / update Stripe integration settings',
        description:
            'Stores the restaurant\'s own Stripe keys. ' +
            'Each restaurant can have a separate Stripe account with its own `secretKey`, ' +
            '`publishableKey`, and `webhookSecret`. ' +
            'The `secretKey` is stored securely and only the last 4 characters are returned in responses.',
    })
    @ApiResponse({ status: 200, description: 'Stripe settings saved.' })
    async upsertSettings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: UpsertStripeSettingsDto,
    ) {
        return {
            message: 'Stripe settings saved successfully',
            data: await this.stripeService.upsertSettings(actor, restaurantId, dto),
        };
    }

    // ─── DELETE settings ──────────────────────────────────────────────────────

    @Delete('settings')
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({ summary: 'Remove Stripe integration settings for a restaurant' })
    @ApiResponse({ status: 200, description: 'Stripe settings removed.' })
    async deleteSettings(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return this.stripeService.deleteSettings(actor, restaurantId);
    }
}
