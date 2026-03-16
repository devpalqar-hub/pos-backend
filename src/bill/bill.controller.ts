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
import { ApiTags } from '@nestjs/swagger';
import { BillService } from './bill.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';

@ApiTags('Bills')
@Controller('restaurants/:restaurantId/bills')
export class BillController {
    constructor(private readonly billService: BillService) { }

    @Post()
    create(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateBillDto,
    ) {
        return this.billService.createBill(restaurantId, dto);
    }

    @Get()
    getRestaurantBills(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    ) {
        return this.billService.getRestaurantBills(restaurantId);
    }

    @Get(':id')
    getBillDetail(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billService.getBillDetail(id);
    }

    @Patch(':id/status')
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateBillStatusDto,
    ) {
        return this.billService.updateStatus(id, dto);
    }

    @Delete(':id')
    deleteBill(
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.billService.deleteBill(id);
    }
}