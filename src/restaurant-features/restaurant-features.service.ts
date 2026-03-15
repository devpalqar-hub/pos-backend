import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantFeatureDto } from './dto/create-restaurant-feature.dto';
import { UpdateRestaurantFeatureDto } from './dto/update-restaurant-feature.dto';

@Injectable()
export class RestaurantFeaturesService {
    constructor(private prisma: PrismaService) { }

    async create(restaurantId: string, dto: CreateRestaurantFeatureDto) {
        return this.prisma.restaurantFeatureFlag.create({
            data: {
                restaurantId,
                feature: dto.feature,
                isEnabled: dto.isEnabled,
            },
        });
    }

    async findAll(restaurantId: string) {
        return this.prisma.restaurantFeatureFlag.findMany({
            where: { restaurantId },
            orderBy: { feature: 'asc' },
        });
    }

    async findOne(id: string) {
        const feature = await this.prisma.restaurantFeatureFlag.findUnique({
            where: { id },
        });

        if (!feature) {
            throw new NotFoundException('Feature not found');
        }

        return feature;
    }

    async update(id: string, dto: UpdateRestaurantFeatureDto) {
        return this.prisma.restaurantFeatureFlag.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        return this.prisma.restaurantFeatureFlag.delete({
            where: { id },
        });
    }
}