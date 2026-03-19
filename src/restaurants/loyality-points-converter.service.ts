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
    // CREATE CONVERTER
    // ================================
    async createConverter(
        actor: User,
        restaurantId: string,
        dto: CreateLoyalityPointsConverterDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        // ================================
        // Ensure only ONE active converter
        // ================================
        const shouldActivate = dto.isActive ?? true;

        if (shouldActivate) {
            await this.prisma.loyalityPointsConverter.updateMany({
                where: {
                    restaurantId,
                    isActive: true,
                },
                data: {
                    isActive: false,
                },
            });
        }

        // ================================
        // CREATE
        // ================================
        const converter = await this.prisma.loyalityPointsConverter.create({
            data: {
                restaurantId,
                points: new Prisma.Decimal(dto.points),
                value: new Prisma.Decimal(dto.value),
                currency: dto.currency ?? 'USD',
                isActive: shouldActivate,
            },
        });

        return converter;
    }

    async updateConverter(
        actor: User,
        restaurantId: string,
        converterId: string,
        dto: UpdateLoyalityPointsConverterDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const existing = await this.prisma.loyalityPointsConverter.findFirst({
            where: {
                id: converterId,
                restaurantId,
            },
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
                    NOT: { id: converterId },
                },
                data: { isActive: false },
            });
        }

        // ================================
        // UPDATE DATA
        // ================================
        const updated = await this.prisma.loyalityPointsConverter.update({
            where: { id: converterId },
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