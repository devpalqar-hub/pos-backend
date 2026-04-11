import { Module } from '@nestjs/common';
import { ToastService } from './toast.service';
import { ToastSettingsController } from './toast-settings.controller';
import { ToastSyncController } from './toast-sync.controller';

@Module({
  imports: [],
  controllers: [ToastSettingsController, ToastSyncController],
  providers: [ToastService],
  exports: [ToastService],
})
export class ToastModule {}
