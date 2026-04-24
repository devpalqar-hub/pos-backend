import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CustomerJwtAuthGuard } from 'src/common/guards/customer-jwt.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Customer Addresses')
@ApiBearerAuth('Bearer')
@Public()
@UseGuards(CustomerJwtAuthGuard)
@Controller('customers/addresses')
export class AddressController {
    constructor(private readonly addressService: AddressService) { }

    @Post()
    @ApiOperation({ summary: 'Create a customer address' })
    @ApiResponse({ status: 201, description: 'Address created successfully.' })
    async create(
        @CurrentUser() customer: any,
        @Body() dto: CreateAddressDto,
    ) {
        return {
            message: 'Address created successfully',
            data: await this.addressService.create(customer.id, customer.restaurantId, dto),
        };
    }

    @Get()
    @ApiOperation({ summary: 'Get all customer addresses' })
    @ApiResponse({ status: 200, description: 'Addresses fetched successfully.' })
    async findAll(@CurrentUser() customer: any) {
        return {
            message: 'Addresses fetched successfully',
            data: await this.addressService.findAll(customer.id, customer.restaurantId),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer address by ID' })
    @ApiResponse({ status: 200, description: 'Address fetched successfully.' })
    @ApiResponse({ status: 404, description: 'Address not found.' })
    async findOne(
        @CurrentUser() customer: any,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Address fetched successfully',
            data: await this.addressService.findOne(customer.id, customer.restaurantId, id),
        };
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update customer address' })
    @ApiResponse({ status: 200, description: 'Address updated successfully.' })
    @ApiResponse({ status: 404, description: 'Address not found.' })
    async update(
        @CurrentUser() customer: any,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAddressDto,
    ) {
        return {
            message: 'Address updated successfully',
            data: await this.addressService.update(customer.id, customer.restaurantId, id, dto),
        };
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete customer address' })
    @ApiResponse({ status: 200, description: 'Address deleted successfully.' })
    @ApiResponse({ status: 404, description: 'Address not found.' })
    async remove(
        @CurrentUser() customer: any,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return {
            message: 'Address deleted successfully',
            data: await this.addressService.remove(customer.id, customer.restaurantId, id),
        };
    }
}
