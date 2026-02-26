import { Module } from '@nestjs/common';
import { LoyalityPointsController } from './loyality-points.controller';
import { LoyalityPointsService } from './loyality-points.service';

@Module({
    controllers: [LoyalityPointsController],
    providers: [LoyalityPointsService],
    exports: [LoyalityPointsService],
})
export class LoyalityPointsModule { }
