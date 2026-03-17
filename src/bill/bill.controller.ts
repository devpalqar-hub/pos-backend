import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    ParseUUIDPipe,
} from '@nestjs/common';

import {
    ApiTags,
    ApiOperation,
    ApiParam,
    ApiBody,
    ApiResponse,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiCreatedResponse,
} from '@nestjs/swagger';

import { BillService } from './bill.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';

@ApiTags('Bills')
@Controller('restaurants/:restaurantId/bills')
export class BillController {
    constructor(private readonly billService: BillService) { }

    @Post()
    @ApiOperation({
        summary: 'Create a new bill',
        description:
            'Creates a bill for a restaurant session with multiple bill items. ' +
            'The bill includes subtotal, tax, discounts, and final payable amount.',
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
        example: 'a0fa1c0e-9c2b-4c7c-a26a-bc54ef1e9090',
    })
    @ApiBody({
        type: CreateBillDto,
        description: 'Bill creation payload including bill items',
    })
    @ApiCreatedResponse({
        description: 'Bill successfully created',
    })
    @ApiBadRequestResponse({
        description: 'Invalid request payload or validation failed',
    })
    create(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateBillDto,
    ) {
        return this.billService.createBill(restaurantId, dto);
    }

    @Get()
    @ApiOperation({
        summary: 'Get all bills for a restaurant',
        description:
            'Returns a list of all bills associated with the specified restaurant.',
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
        example: 'a0fa1c0e-9c2b-4c7c-a26a-bc54ef1e9090',
    })
    @ApiResponse({
        status: 200,
        description: 'List of restaurant bills returned successfully',
    })
    getRestaurantBills(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return this.billService.getRestaurantBills(restaurantId);
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get bill details',
        description:
            'Returns detailed information of a bill including bill items and associated payments.',
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiParam({
        name: 'id',
        description: 'Bill UUID',
        example: 'e1f4c4c8-7b0e-4f6d-b29a-9a6e45f6cbb3',
    })
    @ApiResponse({
        status: 200,
        description: 'Bill details retrieved successfully',
    })
    @ApiNotFoundResponse({
        description: 'Bill not found',
    })
    getBillDetail(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billService.getBillDetail(id);
    }

    @Patch(':id/status')
    @ApiOperation({
        summary: 'Update bill status',
        description:
            'Updates the status of a bill. Valid transitions include DRAFT → FINAL → PAID or VOIDED.',
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiParam({
        name: 'id',
        description: 'Bill UUID',
        example: 'e1f4c4c8-7b0e-4f6d-b29a-9a6e45f6cbb3',
    })
    @ApiBody({
        type: UpdateBillStatusDto,
    })
    @ApiResponse({
        status: 200,
        description: 'Bill status updated successfully',
    })
    @ApiBadRequestResponse({
        description: 'Invalid status transition or payload',
    })
    @ApiNotFoundResponse({
        description: 'Bill not found',
    })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateBillStatusDto,
    ) {
        return this.billService.updateStatus(id, dto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete a bill',
        description:
            'Deletes a bill permanently. Typically allowed only if the bill is not paid.',
    })
    @ApiParam({
        name: 'restaurantId',
        description: 'Restaurant UUID',
    })
    @ApiParam({
        name: 'id',
        description: 'Bill UUID',
        example: 'e1f4c4c8-7b0e-4f6d-b29a-9a6e45f6cbb3',
    })
    @ApiResponse({
        status: 200,
        description: 'Bill deleted successfully',
    })
    @ApiNotFoundResponse({
        description: 'Bill not found',
    })
    @ApiBadRequestResponse({
        description: 'Cannot delete paid bill',
    })
    deleteBill(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billService.deleteBill(id);
    }
}