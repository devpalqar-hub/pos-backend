import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketingService } from './marketing.service';
import { MarketingSettingsController } from './marketing-settings.controller';
import { CampaignsController } from './campaigns.controller';

@Module({
  imports: [
    // ScheduleModule is imported here to ensure the @Cron() decorator works.
    // It is safe to call forRoot() multiple times — NestJS deduplicates it.
    ScheduleModule.forRoot(),
  ],
  controllers: [MarketingSettingsController, CampaignsController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}
