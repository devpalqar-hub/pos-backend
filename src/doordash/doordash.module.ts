import { Module } from '@nestjs/common';
import { DoorDashService } from './doordash.service';
import { DoorDashSettingsController } from './doordash-settings.controller';
import { DoorDashWebhookController } from './doordash-webhook.controller';

@Module({
  imports: [],
  controllers: [DoorDashSettingsController, DoorDashWebhookController],
  providers: [DoorDashService],
  exports: [DoorDashService],
})
export class DoorDashModule {}
