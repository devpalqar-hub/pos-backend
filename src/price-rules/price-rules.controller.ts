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
import { PriceRulesService } from './price-rules.service';
import { CreatePriceRuleDto } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client'

@ApiTags('Price Rules')
@ApiBearerAuth('Bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/menu/:menuItemId/price-rules')
export class PriceRulesController {
  constructor(private readonly priceRulesService: PriceRulesService) { }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a price rule for a menu item' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiResponse({ status: 201, description: 'Price rule created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Restaurant or menu item not found' })
  create(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Body() dto: CreatePriceRuleDto,
  ) {
    return this.priceRulesService.create(actor, restaurantId, menuItemId, dto);
  }

  // ─── List all for a menu item ─────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: 'List all price rules for a menu item' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'List of price rules' })
  findAll(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page ?? '1');
    const limitNum = parseInt(limit ?? '10');
    return this.priceRulesService.findAllByMenuItem(actor, restaurantId, menuItemId, pageNum, limitNum);
  }

  // ─── Effective price ──────────────────────────────────────────────────────

  @Get('effective-price')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({
    summary: 'Get the effective price for a menu item at a given moment',
    description:
      'Evaluates all active price rules and returns the winning special price (or base price if no rule matches). Pass optional `atTime` ISO string to check a future/past moment.',
  })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiQuery({
    name: 'atTime',
    required: false,
    description: 'ISO 8601 datetime to evaluate rules at (defaults to now)',
    example: '2025-12-01T10:30:00.000Z',
  })
  @ApiResponse({ status: 200, description: 'Effective price with applied rule info' })
  getEffectivePrice(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Query('atTime') atTime?: string,
  ) {
    return this.priceRulesService.getEffectivePrice(
      actor,
      restaurantId,
      menuItemId,
      atTime ? new Date(atTime) : undefined,
    );
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: 'Get a single price rule by ID' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiParam({ name: 'id', description: 'Price rule UUID' })
  @ApiResponse({ status: 200, description: 'Price rule details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.priceRulesService.findOne(actor, restaurantId, menuItemId, id);
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiOperation({ summary: 'Update a price rule' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiParam({ name: 'id', description: 'Price rule UUID' })
  @ApiResponse({ status: 200, description: 'Updated price rule' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceRuleDto,
  ) {
    return this.priceRulesService.update(actor, restaurantId, menuItemId, id, dto);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a price rule' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'menuItemId', description: 'Menu item UUID' })
  @ApiParam({ name: 'id', description: 'Price rule UUID' })
  @ApiResponse({ status: 200, description: 'Price rule deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  remove(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('menuItemId', ParseUUIDPipe) menuItemId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.priceRulesService.remove(actor, restaurantId, menuItemId, id);
  }
}
