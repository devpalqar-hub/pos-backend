import { SetMetadata } from '@nestjs/common';
import { RestaurantFeature } from '@prisma/client';

export const RESTAURANT_FEATURE_KEY = 'restaurant_feature';

export const RequireRestaurantFeature = (feature: RestaurantFeature) =>
    SetMetadata(RESTAURANT_FEATURE_KEY, feature);