import { Module } from '@nestjs/common';
import { DeliveryChargeController } from './delivery-charge.controller';
import { DeliveryChargeService } from './delivery-charge.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
    controllers: [DeliveryChargeController],
    providers: [DeliveryChargeService, PrismaService],
    exports: [DeliveryChargeService],
})
export class DeliveryChargeModule { }
