import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TriggerCampaignsService } from './trigger-campaigns.service';
import { TriggerCampaignsController } from './trigger-campaigns.controller';

@Module({
    imports: [
        ScheduleModule.forRoot(),
    ],
    controllers: [TriggerCampaignsController],
    providers: [TriggerCampaignsService],
    exports: [TriggerCampaignsService],
})
export class TriggerCampaignsModule { }
