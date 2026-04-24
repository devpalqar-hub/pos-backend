import {
    Body,
    Controller,
    Get,
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
import { DeliveryChargeService } from './delivery-charge.service';
import { UpsertDeliveryChargeDto } from './dto/upsert-delivery-charge.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Restaurant Delivery Charge')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/delivery-charge')
export class DeliveryChargeController {
    constructor(private readonly deliveryChargeService: DeliveryChargeService) { }

    @Get()
    @Roles(
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
        UserRole.WAITER,
        UserRole.CHEF,
        UserRole.BILLER,
    )
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({ summary: 'Get restaurant delivery charge' })
    @ApiResponse({ status: 200, description: 'Delivery charge fetched successfully.' })
    async getDeliveryCharge(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return {
            message: 'Delivery charge fetched successfully',
            data: await this.deliveryChargeService.getDeliveryCharge(actor, restaurantId),
        };
    }

    @Put()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiOperation({ summary: 'Create or update restaurant delivery charge' })
    @ApiResponse({ status: 200, description: 'Delivery charge saved successfully.' })
    async upsertDeliveryCharge(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: UpsertDeliveryChargeDto,
    ) {
        return {
            message: 'Delivery charge saved successfully',
            data: await this.deliveryChargeService.upsertDeliveryCharge(actor, restaurantId, dto),
        };
    }
}
