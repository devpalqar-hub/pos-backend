import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from 'src/common/utlility/pagination.util';

@Injectable()
export class VendorService {
    constructor(private prisma: PrismaService) { }

    // CREATE
    async create(restaurantId: string, dto: any) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        const { categoryIds = [], ...vendorData } = dto;

        return this.prisma.vendor.create({
            data: {
                ...vendorData,
                restaurantId,
                ...(categoryIds.length > 0 && {
                    categories: {
                        connect: categoryIds.map((id: string) => ({ id })),
                    },
                }),
            },
            include: { categories: true },
        });
    }

    async findAll(restaurantId: string, query: any) {
        const {
            page = 1,
            limit = 10,
            search,
            categoryId,
            fetchAll,
        } = query;

        const where = {
            restaurantId,
            isActive: true,
            ...(search && {
                name: { contains: search },
            }),
            ...(categoryId && {
                categories: {
                    some: { id: categoryId },
                },
            }),
        };

        return paginate({
            prismaModel: this.prisma.vendor,
            page: Number(page),
            limit: Number(limit),
            fetchAll: fetchAll === 'true' || fetchAll === true,
            where,
            include: {
                categories: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    // GET BY ID
    async findOne(id: string) {
        const vendor = await this.prisma.vendor.findUnique({
            where: { id },
            include: { categories: true },
        });

        if (!vendor) throw new NotFoundException('Vendor not found');
        return vendor;
    }

    // UPDATE
    async update(id: string, dto: any) {
        await this.findOne(id);
        const { categoryIds, ...vendorData } = dto;

        return this.prisma.vendor.update({
            where: { id },
            data: {
                ...vendorData,
                ...(categoryIds && {
                    categories: {
                        set: categoryIds.map((id: string) => ({ id })),
                    },
                }),
            },
            include: { categories: true },
        });
    }

    // DELETE (soft)
    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.vendor.update({
            where: { id },
            data: { isActive: false },
        });
    }
}