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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('restaurants/:restaurantId/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  // ─── Create ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiOperation({
    summary: 'Create a menu category',
    description: `
Creates a new category for the specified restaurant. Category names are **unique per restaurant**.

**Image**: First upload the image via \`POST /upload/image?folder=categories\`, then pass the returned URL in \`imageUrl\`.

**Allowed roles**: SUPER_ADMIN, OWNER, RESTAURANT_ADMIN
    `,
  })
  @ApiResponse({ status: 201, description: 'Category created.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  @ApiResponse({ status: 409, description: 'Category name already exists in this restaurant.' })
  async create(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return {
      message: 'Category created successfully',
      data: await this.categoriesService.create(actor, restaurantId, dto),
    };
  }

  // ─── List ─────────────────────────────────────────────────────────────────

  @Get()
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiOperation({
    summary: 'List all categories for a restaurant',
    description:
      'Returns all categories ordered by `sortOrder` then name. ' +
      'Includes item count per category. Accessible by all roles assigned to the restaurant.',
  })
  @ApiResponse({ status: 200, description: 'Category list returned.' })
  @ApiResponse({ status: 403, description: 'Not assigned to this restaurant.' })
  @ApiResponse({ status: 404, description: 'Restaurant not found.' })
  async findAll(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      message: 'Categories fetched successfully',
      data: await this.categoriesService.findAll(actor, restaurantId, parseInt(page ?? '1'), parseInt(limit ?? '10')),
    };
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiOperation({
    summary: 'Get a category with its active menu items',
    description:
      'Returns the category details plus all active items belonging to it (sorted by sortOrder).',
  })
  @ApiResponse({ status: 200, description: 'Category found.' })
  @ApiResponse({ status: 404, description: 'Category or restaurant not found.' })
  async findOne(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      message: 'Category fetched successfully',
      data: await this.categoriesService.findOne(actor, restaurantId, id),
    };
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiOperation({
    summary: 'Update a category',
    description:
      'Update name, description, image, sort order, or active status. ' +
      'If a new `imageUrl` is provided, the old S3 image is automatically deleted.',
  })
  @ApiResponse({ status: 200, description: 'Category updated.' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Category or restaurant not found.' })
  @ApiResponse({ status: 409, description: 'Category name already exists in this restaurant.' })
  async update(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return {
      message: 'Category updated successfully',
      data: await this.categoriesService.update(actor, restaurantId, id, dto),
    };
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiOperation({
    summary: 'Delete a category',
    description:
      'Deletes a category **only if it has no menu items**. ' +
      'Remove or reassign all items first. S3 image is deleted automatically.',
  })
  @ApiResponse({ status: 200, description: 'Category deleted.' })
  @ApiResponse({ status: 403, description: 'Category still has items, or insufficient permissions.' })
  @ApiResponse({ status: 404, description: 'Category or restaurant not found.' })
  async remove(
    @CurrentUser() actor: User,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(actor, restaurantId, id);
  }
}
