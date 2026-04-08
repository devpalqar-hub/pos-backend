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
import { VendorService } from './vendor.service';
import {
    ApiTags,
    ApiParam,
    ApiOperation,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Vendors')
@Controller('restaurants/:restaurantId/vendors')
export class VendorController {
    constructor(private service: VendorService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.WAITER, UserRole.CHEF)
    @ApiOperation({
        summary: 'Create a vendor',
        description:
            'Creates a vendor under the selected restaurant. categoryIds is optional and can be used to map vendor categories.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiResponse({ status: 201, description: 'Vendor created successfully.' })
    @ApiResponse({ status: 404, description: 'Restaurant or one of the category IDs was not found.' })
    create(
        @Param('restaurantId') restaurantId: string,
        @Body() dto: CreateVendorDto,
    ) {
        return this.service.create(restaurantId, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'List vendors',
        description:
            'Returns active vendors for a restaurant with pagination, optional search by name, and optional category filter.',
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
        example: 'fresh supplier',
        description: 'Case-insensitive search on vendor name.',
    })
    @ApiQuery({
        name: 'categoryId',
        required: false,
        type: String,
        description: 'Filter vendors that are mapped to this vendor category UUID.',
    })
    @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID' })
    @ApiResponse({ status: 200, description: 'Vendors fetched successfully.' })
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
        summary: 'Get vendor by ID',
        description: 'Returns a single vendor along with all mapped vendor categories.',
    })
    @ApiParam({ name: 'id', description: 'Vendor UUID' })
    @ApiResponse({ status: 200, description: 'Vendor fetched successfully.' })
    @ApiResponse({ status: 404, description: 'Vendor not found.' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Update vendor',
        description:
            'Updates vendor details. If categoryIds are provided, existing category mappings are replaced with the provided list.',
    })
    @ApiParam({ name: 'id', description: 'Vendor UUID' })
    @ApiResponse({ status: 200, description: 'Vendor updated successfully.' })
    @ApiResponse({ status: 404, description: 'Vendor not found.' })
    update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Soft delete vendor',
        description: 'Marks vendor as inactive by setting isActive=false.',
    })
    @ApiParam({ name: 'id', description: 'Vendor UUID' })
    @ApiResponse({ status: 200, description: 'Vendor deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Vendor not found.' })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}