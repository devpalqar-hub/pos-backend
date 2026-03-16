import {
    CanActivate,
    ExecutionContext,
    Injectable,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RESTAURANT_FEATURE_KEY } from '../decorators/feature.decorator';
import { RestaurantFeature } from '@prisma/client';

@Injectable()
export class RestaurantFeatureGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.getAllAndOverride<RestaurantFeature>(
            RESTAURANT_FEATURE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredFeature) return true;

        const request = context.switchToHttp().getRequest();

        const restaurantId =
            request.params.restaurantId ||
            request.body.restaurantId ||
            request.query.restaurantId;

        if (!restaurantId) {
            throw new ForbiddenException('Restaurant ID not provided');
        }

        const feature = await this.prisma.restaurantFeatureFlag.findUnique({
            where: {
                restaurantId_feature: {
                    restaurantId,
                    feature: requiredFeature,
                },
            },
        });

        if (!feature || !feature.isEnabled) {
            throw new ForbiddenException(
                `${requiredFeature} feature is disabled for this restaurant`,
            );
        }

        return true;
    }
}