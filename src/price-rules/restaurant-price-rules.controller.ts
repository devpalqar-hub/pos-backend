import {
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { PriceRulesService } from './price-rules.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Price Rules')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/price-rules')
export class RestaurantPriceRulesController {
    constructor(private readonly priceRulesService: PriceRulesService) { }

    @Get()
    @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
    @ApiOperation({ summary: 'Get all price rules for a restaurant' })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
    @ApiQuery({ name: 'ruleType', required: false, type: String, enum: ['RECURRING_WEEKLY', 'LIMITED_TIME'], description: 'Filter by rule type' })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
    @ApiQuery({ name: 'menuItemId', required: false, type: String, description: 'Filter by menu item UUID' })
    @ApiResponse({ status: 200, description: 'List of all price rules for the restaurant' })
    @ApiResponse({ status: 403, description: 'Forbidden' })
    @ApiResponse({ status: 404, description: 'Restaurant not found' })
    getAllByRestaurantId(
        @CurrentUser() actor: User,
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('ruleType') ruleType?: string,
        @Query('isActive') isActive?: string,
        @Query('menuItemId') menuItemId?: string,
    ) {
        const pageNum = parseInt(page ?? '1');
        const limitNum = parseInt(limit ?? '10');
        const isActiveValue = isActive !== undefined ? isActive === 'true' : undefined;

        return this.priceRulesService.findAllByRestaurant(
            actor,
            restaurantId,
            pageNum,
            limitNum,
            ruleType as any,
            isActiveValue,
            menuItemId,
        );
    }
}
