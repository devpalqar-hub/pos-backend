import { Module } from '@nestjs/common';
import { RestaurantFeaturesController } from './restaurant-features.controller';
import { RestaurantFeaturesService } from './restaurant-features.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [RestaurantFeaturesController],
    providers: [RestaurantFeaturesService, PrismaService],
    exports: [RestaurantFeaturesService],
})
export class RestaurantFeaturesModule { }