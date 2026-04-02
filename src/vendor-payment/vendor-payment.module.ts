import { Module } from '@nestjs/common';
import { VendorPaymentService } from './vendor-payment.service';
import { VendorPaymentController } from './vendor-payment.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [VendorPaymentController],
    providers: [VendorPaymentService, PrismaService],
})
export class VendorPaymentModule { }