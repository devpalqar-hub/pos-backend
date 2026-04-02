import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from 'src/common/utlility/pagination.util';

@Injectable()
export class VendorCategoryService {
    constructor(private prisma: PrismaService) { }

    async create(restaurantId: string, dto: any) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        return this.prisma.vendorCategory.create({
            data: {
                ...dto,
                restaurantId,
            },
        });
    }

    async findAll(restaurantId: string, query: any) {
        const {
            page = 1,
            limit = 10,
            fetchAll,
            search,
        } = query;

        const where = {
            restaurantId,
            isActive: true,
            ...(search && {
                name: { contains: search },
            }),
        };

        return paginate({
            prismaModel: this.prisma.vendorCategory,
            page: Number(page),
            limit: Number(limit),
            fetchAll: fetchAll === 'true' || fetchAll === true,
            where,
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const category = await this.prisma.vendorCategory.findUnique({
            where: { id },
        });

        if (!category) throw new NotFoundException('Category not found');
        return category;
    }

    async update(id: string, dto: any) {
        await this.findOne(id);

        return this.prisma.vendorCategory.update({
            where: { id },
            data: dto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.vendorCategory.update({
            where: { id },
            data: { isActive: false },
        });
    }
}