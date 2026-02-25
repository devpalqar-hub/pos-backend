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
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { StockActionDto } from './dto/stock-action.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client'

@ApiTags('Menu Items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) { }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.CHEF)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Create a menu item',
    description: `
Creates a new item in the restaurant menu.

**Image workflow**: Upload image first via \`POST /upload/image?folder=menu-items\`, then pass the returned URL in \`imageUrl\`. Only **one image** per item.

**Item Types:**
- \`NON_STOCKABLE\` — No count. Admin/Chef marks it out-of-stock for the day; **auto-resets at midnight**.
- \`STOCKABLE\` — Tracks a unit count. Goes out-of-stock when count = 0. Requires \`stockCount\` on creation.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN, CHEF
    `,
  })
  @ApiResponse({ status: 201, description: 'Menu item created.' })
  @ApiResponse({ status: 400, description: 'Validation error or missing stockCount for STOCKABLE.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Restaurant or category not found.' })
  async create(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return {
      message: 'Menu item created successfully',
      data: await this.menuService.create(actor, restaurantId, dto),
    };
  }

  // ─── List All ─────────────────────────────────────────────────────────────

  @Get()
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category UUID',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiOperation({
    summary: 'List menu items for a restaurant',
    description:
      'Returns all menu items ordered by category, then sortOrder, then name. ' +
      'Optionally filter by `categoryId`. Accessible by all roles assigned to the restaurant.',
  })
  @ApiResponse({ status: 200, description: 'Menu items returned.' })
  @ApiResponse({ status: 403, description: 'Not assigned to this restaurant.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async findAll(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = parseInt(page ?? '1');
    const limitNum = parseInt(limit ?? '10');
    const data = categoryId
      ? await this.menuService.findByCategory(actor, restaurantId, categoryId, pageNum, limitNum)
      : await this.menuService.findAll(actor, restaurantId, pageNum, limitNum);

    return {
      message: 'Menu items fetched successfully',
      data,
    };
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Menu item UUID' })
  @ApiOperation({
    summary: 'Get a single menu item by ID',
    description: 'Returns full item details including category, restaurant info, stock status.',
  })
  @ApiResponse({ status: 200, description: 'Menu item found.' })
  @ApiResponse({ status: 404, description: 'Menu item or restaurant not found.' })
  async findOne(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      message: 'Menu item fetched successfully',
      data: await this.menuService.findOne(actor, restaurantId, id),
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN, UserRole.CHEF)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Menu item UUID' })
  @ApiOperation({
    summary: 'Update a menu item',
    description:
      'Update name, description, price, category, image, sort order, or active status. ' +
      'If a new `imageUrl` is provided, the previous S3 image is deleted automatically. ' +
      '**Note**: To change stock use the dedicated stock endpoint `POST /:id/stock`.',
  })
  @ApiResponse({ status: 200, description: 'Menu item updated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Menu item, category or restaurant not found.' })
  async update(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return {
      message: 'Menu item updated successfully',
      data: await this.menuService.update(actor, restaurantId, id, dto),
    };
  }

  // ─── Stock Management ─────────────────────────────────────────────────────

  @Post(':id/stock')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.OWNER,
    UserRole.RESTAURANT_ADMIN,
    UserRole.CHEF,
  )
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Menu item UUID' })
  @ApiOperation({
    summary: 'Manage item stock / availability',
    description: `
Controls the availability of a menu item. Accessible by **RESTAURANT_ADMIN**, **CHEF** (and above).

### Actions

| Action | STOCKABLE | NON_STOCKABLE |
|--------|-----------|---------------|
| \`MARK_OUT_OF_STOCK\` | Sets count=0, flags OOS | Flags OOS — **auto-resets at midnight** |
| \`SET_STOCK\` | Sets absolute count *(requires quantity)* | ❌ Not applicable |
| \`DECREASE_STOCK\` | Reduces count by qty *(requires quantity)* | ❌ Not applicable |
| \`RESTOCK\` | Sets count to qty *(requires quantity)* | Clears OOS flag immediately |

**NON_STOCKABLE auto-restock**: A scheduled job runs every midnight and resets all NON_STOCKABLE items that were marked out-of-stock back to in-stock automatically.
    `,
  })
  @ApiResponse({ status: 200, description: 'Stock action applied.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid action for item type, or missing quantity.',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Menu item or restaurant not found.' })
  async manageStock(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StockActionDto,
  ) {
    return {
      message: 'Stock action applied successfully',
      data: await this.menuService.manageStock(actor, restaurantId, id, dto),
    };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Menu item UUID' })
  @ApiOperation({
    summary: 'Delete a menu item',
    description:
      'Permanently deletes the item and removes its image from S3. ' +
      'To temporarily hide an item use `PATCH /:id` with `isActive: false` instead.',
  })
  @ApiResponse({ status: 200, description: 'Menu item deleted.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Menu item or restaurant not found.' })
  async remove(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.menuService.remove(actor, restaurantId, id);
  }
}
