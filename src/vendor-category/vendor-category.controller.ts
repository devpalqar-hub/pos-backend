import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { VendorCategoryService } from './vendor-category.service';
import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { CreateVendorCategoryDto } from './dto/create-vendor-category.dto';
import { UpdateVendorCategoryDto } from './dto/update-vendor-category.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Vendor Categories')
@Controller('restaurants/:restaurantId/vendor-categories')
export class VendorCategoryController {
    constructor(private service: VendorCategoryService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Create vendor category',
        description: 'Creates a vendor category under the selected restaurant.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiResponse({ status: 201, description: 'Vendor category created successfully.' })
    @ApiResponse({ status: 404, description: 'Restaurant not found.' })
    create(
        @Param('restaurantId') restaurantId: string,
        @Body() dto: CreateVendorCategoryDto,
    ) {
        return this.service.create(restaurantId, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.WAITER, UserRole.CHEF)
    @ApiOperation({
        summary: 'List vendor categories',
        description:
            'Returns active vendor categories for a restaurant with pagination and optional search by category name.',
    })
    @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
    @ApiQuery({
        name: 'fetchAll',
        required: false,
        type: Boolean,
        description: 'If true, ignores pagination and returns all matching records.',
    })
    @ApiQuery({
        name: 'search',
        required: false,
        example: 'vegetable',
        description: 'Case-insensitive search on category name.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiResponse({ status: 200, description: 'Vendor categories fetched successfully.' })
    findAll(
        @Param('restaurantId') restaurantId: string,
        @Query() query: any,
    ) {
        return this.service.findAll(restaurantId, query);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.WAITER, UserRole.CHEF)
    @ApiOperation({
        summary: 'Get vendor category by ID',
        description: 'Returns details of a single vendor category.',
    })
    @ApiParam({ name: 'id', description: 'Vendor category UUID' })
    @ApiResponse({ status: 200, description: 'Vendor category fetched successfully.' })
    @ApiResponse({ status: 404, description: 'Vendor category not found.' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Update vendor category',
        description: 'Updates category details such as name and description.',
    })
    @ApiParam({ name: 'id', description: 'Vendor category UUID' })
    @ApiResponse({ status: 200, description: 'Vendor category updated successfully.' })
    @ApiResponse({ status: 404, description: 'Vendor category not found.' })
    update(@Param('id') id: string, @Body() dto: UpdateVendorCategoryDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Soft delete vendor category',
        description: 'Marks category as inactive by setting isActive=false.',
    })
    @ApiParam({ name: 'id', description: 'Vendor category UUID' })
    @ApiResponse({ status: 200, description: 'Vendor category deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Vendor category not found.' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}