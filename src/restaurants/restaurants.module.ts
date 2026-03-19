import { Module } from '@nestjs/common';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { LoyalityPointsConverterController } from './loyality-points-converter.controller';
import { LoyalityPointsConverterService } from './loyality-points-converter.service';

@Module({
    controllers: [RestaurantsController, LoyalityPointsConverterController],
    providers: [RestaurantsService, LoyalityPointsConverterService],
    exports: [RestaurantsService, LoyalityPointsConverterService],
})
export class RestaurantsModule { }
