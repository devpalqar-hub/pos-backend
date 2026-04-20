import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DoorDashService } from './doordash.service';
import { DoorDashSettingsController } from './doordash-settings.controller';
import { DoorDashWebhookController } from './doordash-webhook.controller';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [ConfigModule, OrdersModule],
  controllers: [DoorDashSettingsController, DoorDashWebhookController],
  providers: [DoorDashService],
  exports: [DoorDashService],
})
export class DoorDashModule { }
