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
- totalAmount is derived from linked expense.amount
- paidAmount is the amount passed by user in request
- dueAmount = expense.amount - sum(all paidAmount for this expense)
- status becomes PARTIAL or PAID based on due amount

### Use case:
Record invoice received from vendor

### Expense link:
- expenseId is required to map this vendor payment to an expense record.
 
### Validation:
- Overpayment is blocked if paidAmount exceeds the remaining payable amount for that expense.
    `,
    })
    @ApiResponse({ status: 201, description: 'Vendor payment created with vendor and expense details' })
    @ApiResponse({ status: 404, description: 'Expense not found (when expenseId is provided)' })
    @ApiResponse({ status: 400, description: 'Expense does not belong to provided restaurant' })
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
- expenseId
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
    @ApiQuery({ name: 'expenseId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiQuery({ name: 'search', required: false })
    @ApiResponse({ status: 200, description: 'Vendor payments list with vendor and expense details' })
    findAll(@Query() query: VendorPaymentQueryDto) {
        return this.service.findAll(query);
    }

    // ─── GET BY ID ──────────────────────────────────────────
    @Get(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.RESTAURANT_ADMIN, UserRole.OWNER, UserRole.SUPER_ADMIN)
    @ApiOperation({ summary: 'Get vendor payment by ID' })
    @ApiParam({ name: 'id', description: 'Vendor Payment ID' })
    @ApiResponse({ status: 200, description: 'Vendor payment fetched with vendor and expense details' })
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

⚠️ Avoid modifying financial fields (totalAmount) after creation.

If expenseId is provided, it will relink this payment to the specified expense.
    `,
    })
    @ApiResponse({ status: 200, description: 'Vendor payment updated with vendor and expense details' })
    @ApiResponse({ status: 404, description: 'Vendor payment or expense not found' })
    @ApiResponse({ status: 400, description: 'Expense does not belong to this payment restaurant' })
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