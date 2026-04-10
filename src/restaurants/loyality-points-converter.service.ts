import {
    Injectable,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserRole, Prisma } from '@prisma/client';
import { CreateLoyalityPointsConverterDto } from './dto/loyality-point-converter.dto';
import { UpdateLoyalityPointsConverterDto } from './dto/loyality-point-converter-update.dto';

@Injectable()
export class LoyalityPointsConverterService {
    constructor(private readonly prisma: PrismaService) { }

    private async assertRestaurantExists(restaurantId: string) {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }
    }

    // ================================
    // ACCESS CONTROL (reuse your pattern)
    // ================================
    private async assertRestaurantAccess(actor: User, restaurantId: string) {
        const allowedRoles: UserRole[] = [
            UserRole.SUPER_ADMIN,
            UserRole.OWNER,
            UserRole.RESTAURANT_ADMIN,
        ];

        if (!allowedRoles.includes(actor.role)) {
            throw new ForbiddenException(
                'You do not have access to this restaurant',
            );
        }

        // Optional: extend with restaurant ownership validation if needed
    }

    // ================================
    // READ ALL CONVERTERS
    // ================================
    async getAllConverters(actor: User, restaurantId: string) {
        await this.assertRestaurantExists(restaurantId);
        await this.assertRestaurantAccess(actor, restaurantId);

        return this.prisma.loyalityPointsConverter.findMany({
            where: { restaurantId },
            orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        });
    }

    // ================================
    // READ CONVERTER BY ID
    // ================================
    async getConverterById(
        actor: User,
        restaurantId: string,
        converterId: string,
    ) {
        await this.assertRestaurantExists(restaurantId);
        await this.assertRestaurantAccess(actor, restaurantId);

        const converter = await this.prisma.loyalityPointsConverter.findFirst({
            where: {
                id: converterId,
                restaurantId,
            },
        });

        if (!converter) {
            throw new NotFoundException('Converter not found');
        }

        return converter;
    }

    // ================================
    // CREATE CONVERTER
    // ================================
    async createConverter(
        actor: User,
        restaurantId: string,
        dto: CreateLoyalityPointsConverterDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        return this.prisma.$transaction(async (tx) => {
            await tx.loyalityPointsConverter.deleteMany({
                where: { restaurantId },
            });

            return tx.loyalityPointsConverter.create({
                data: {
                    restaurantId,
                    points: new Prisma.Decimal(dto.points),
                    value: new Prisma.Decimal(dto.value),
                    currency: dto.currency ?? 'USD',
                    isActive: dto.isActive ?? true,
                },
            });
        });
    }

    async updateConverter(
        actor: User,
        restaurantId: string,
        dto: UpdateLoyalityPointsConverterDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const existing = await this.prisma.loyalityPointsConverter.findFirst({
            where: {
                restaurantId,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!existing) {
            throw new NotFoundException('Converter not found');
        }

        // ================================
        // HANDLE ACTIVE SWITCH
        // ================================
        if (dto.isActive === true) {
            await this.prisma.loyalityPointsConverter.updateMany({
                where: {
                    restaurantId,
                    isActive: true,
                    NOT: { id: existing.id },
                },
                data: { isActive: false },
            });
        }

        // ================================
        // UPDATE DATA
        // ================================
        const updated = await this.prisma.loyalityPointsConverter.update({
            where: { id: existing.id },
            data: {
                ...(dto.points && {
                    points: new Prisma.Decimal(dto.points),
                }),
                ...(dto.value && {
                    value: new Prisma.Decimal(dto.value),
                }),
                ...(dto.currency && {
                    currency: dto.currency,
                }),
                ...(dto.isActive !== undefined && {
                    isActive: dto.isActive,
                }),
            },
        });

        return updated;
    }
}