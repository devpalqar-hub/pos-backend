import { Module } from '@nestjs/common';
import { PriceRulesService } from './price-rules.service';
import { PriceRulesController } from './price-rules.controller';
import { RestaurantPriceRulesController } from './restaurant-price-rules.controller';

@Module({
  controllers: [PriceRulesController, RestaurantPriceRulesController],
  providers: [PriceRulesService],
  exports: [PriceRulesService],
})
export class PriceRulesModule { }
