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
import { VendorPaymentService } from './vendor-payment.service';
import {
    ApiTags,
    ApiOperation,
    ApiQuery,
    ApiParam,
    ApiResponse,
} from '@nestjs/swagger';
import { CreateVendorPaymentDto } from './dto/create-vendor-payment.dto';
import { UpdateVendorPaymentDto } from './dto/update-vendor-payment.dto';
import { VendorPaymentQueryDto } from './dto/vendor-payment-query.dto';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('Vendor Payments')
@Controller('restaurants/:restaurantId/vendor-payments')
export class VendorPaymentController {
    constructor(private readonly service: VendorPaymentService) { }

    // ─── CREATE ─────────────────────────────────────────────
    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Create Vendor Payment (Invoice Entry)',
        description: `
Creates a vendor payable record.

### Behavior:
- paidAmount is the amount passed by user in request
- dueAmount = total vendor expenses - sum(all paidAmount for this vendor)
- status becomes PENDING or PAID based on due amount

### Use case:
Record invoice received from vendor

### Validation:
- Overpayment is blocked if paidAmount exceeds the remaining payable amount for that vendor.
    `,
    })
    @ApiResponse({ status: 201, description: 'Vendor payment created with vendor details' })
    @ApiResponse({ status: 404, description: 'Vendor not found' })
    @ApiResponse({ status: 400, description: 'Overpayment attempted' })
    create(@Body() dto: CreateVendorPaymentDto) {
        return this.service.create(dto);
    }

    // ─── GET ALL ────────────────────────────────────────────
    @Get()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Get all vendor payments',
        description: `
Supports pagination, filtering, and search.

### Filters:
- vendorId
- status
- search (vendor name, notes)

### Pagination:
- page
- limit
- fetchAll
    `,
    })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'fetchAll', required: false })
    @ApiQuery({ name: 'vendorId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Vendor payments list with vendor details' })
    findAll(@Query() query: VendorPaymentQueryDto) {
        return this.service.findAll(query);
    }

    // ─── GET BY ID ──────────────────────────────────────────
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get vendor payment by ID' })
    @ApiParam({ name: 'id', description: 'Vendor Payment ID' })
    @ApiResponse({ status: 200, description: 'Vendor payment fetched with vendor details' })
    @ApiResponse({ status: 404, description: 'Vendor payment not found' })
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    // ─── UPDATE ─────────────────────────────────────────────
    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Update vendor payment',
        description: `
Update vendor payment details.

Financial fields (paidAmount, dueAmount, status) are recalculated against vendor-level totals.
    `,
    })
    @ApiResponse({ status: 200, description: 'Vendor payment updated with vendor details' })
    @ApiResponse({ status: 404, description: 'Vendor payment or vendor not found' })
    @ApiResponse({ status: 400, description: 'Overpayment attempted' })
    update(
        @Param('id') id: string,
        @Body() dto: UpdateVendorPaymentDto,
    ) {
        return this.service.update(id, dto);
    }

    // ─── DELETE ─────────────────────────────────────────────
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({
        summary: 'Delete vendor payment',
        description: `Deletes vendor payment record permanently`,
    })
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}