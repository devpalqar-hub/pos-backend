import { Module } from '@nestjs/common';
import { UberEatsService } from './uber-eats.service';
import { UberEatsSettingsController } from './uber-eats-settings.controller';
import { UberEatsWebhookController } from './uber-eats-webhook.controller';

@Module({
    imports: [],
    controllers: [UberEatsSettingsController, UberEatsWebhookController],
    providers: [UberEatsService],
    exports: [UberEatsService],
})
export class UberEatsModule { }
