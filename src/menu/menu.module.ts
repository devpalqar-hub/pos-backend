import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { OrdersGateway } from 'src/orders/orders.gateway';
import { OrdersModule } from 'src/orders/orders.module';

@Module({
  imports: [OrdersModule, ScheduleModule.forRoot()],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule { }
