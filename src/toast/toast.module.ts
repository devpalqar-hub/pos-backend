import { Module } from '@nestjs/common';
import { ToastService } from './toast.service';
import { ToastSettingsController } from './toast-settings.controller';
import { ToastSyncController } from './toast-sync.controller';
import { ToastWebhookController } from './toast-webhook.controller';

@Module({
  imports: [],
  controllers: [ToastSettingsController, ToastSyncController, ToastWebhookController],
  providers: [ToastService],
  exports: [ToastService],
})
export class ToastModule {}

