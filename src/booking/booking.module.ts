import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { OrdersModule } from 'src/orders/orders.module';
import { DoorDashModule } from '../doordash/doordash.module';

@Module({
    imports: [OrdersModule, DoorDashModule],
    controllers: [BookingController],
    providers: [BookingService, PrismaService, CartService],
})
export class BookingModule { }