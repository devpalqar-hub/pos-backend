import {
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { CreateLoyalityPointDto } from './dto/create-loyality-point.dto';
import { UpdateLoyalityPointDto } from './dto/update-loyality-point.dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class LoyalityPointsService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Shared include for reads ─────────────────────────────────────────────

    private readonly defaultInclude = {
        weekDays: { select: { id: true, day: true } },
        categories: {
            select: {
                id: true,
                category: { select: { id: true, name: true } },
            },
        },
        menuItems: {
            select: {
                id: true,
                menuItem: { select: { id: true, name: true } },
            },
        },
    };

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(
        actor: User,
        restaurantId: string,
        dto: CreateLoyalityPointDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        return this.prisma.loyalityPoint.create({
            data: {
                restaurantId,
                name: dto.name,
                points: dto.points ?? 0,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                startTime: dto.startTime ?? null,
                endTime: dto.endTime ?? null,
                maxUsagePerCustomer: dto.maxUsagePerCustomer ?? null,

                // Many-to-many: weekDays
                weekDays: dto.weekDays?.length
                    ? {
                        create: dto.weekDays.map((day) => ({ day })),
                    }
                    : undefined,

                // Many-to-many: categories
                categories: dto.categoryIds?.length
                    ? {
                        create: dto.categoryIds.map((categoryId) => ({ categoryId })),
                    }
                    : undefined,

                // Many-to-many: menu items
                menuItems: dto.menuItemIds?.length
                    ? {
                        create: dto.menuItemIds.map((menuItemId) => ({ menuItemId })),
                    }
                    : undefined,
            },
            include: this.defaultInclude,
        });
    }

    // ─── List (paginated) ────────────────────────────────────────────────────

    async findAll(actor: User, restaurantId: string, page = 1, limit = 10) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        return paginate({
            prismaModel: this.prisma.loyalityPoint,
            page,
            limit,
            where: { restaurantId },
            orderBy: [{ createdAt: 'desc' }],
            include: this.defaultInclude,
        });
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    async findOne(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const record = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
            include: {
                ...this.defaultInclude,
                redemptions: {
                    orderBy: { redeemedAt: 'desc' },
                    take: 20,
                    include: {
                        customer: { select: { id: true, name: true, phone: true } },
                    },
                },
            },
        });

        if (!record) {
            throw new NotFoundException(
                `Loyalty point rule ${id} not found in restaurant ${restaurantId}`,
            );
        }

        return record;
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    async update(
        actor: User,
        restaurantId: string,
        id: string,
        dto: UpdateLoyalityPointDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const existing = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
        });
        if (!existing) {
            throw new NotFoundException(
                `Loyalty point rule ${id} not found in restaurant ${restaurantId}`,
            );
        }

        // Use a transaction to replace junction rows atomically
        return this.prisma.$transaction(async (tx) => {
            // Replace weekDays if provided
            if (dto.weekDays !== undefined) {
                await tx.loyalityPointDay.deleteMany({
                    where: { loyalityPointId: id },
                });
                if (dto.weekDays.length) {
                    await tx.loyalityPointDay.createMany({
                        data: dto.weekDays.map((day) => ({ loyalityPointId: id, day })),
                    });
                }
            }

            // Replace categories if provided
            if (dto.categoryIds !== undefined) {
                await tx.loyalityPointCategory.deleteMany({
                    where: { loyalityPointId: id },
                });
                if (dto.categoryIds.length) {
                    await tx.loyalityPointCategory.createMany({
                        data: dto.categoryIds.map((categoryId) => ({
                            loyalityPointId: id,
                            categoryId,
                        })),
                    });
                }
            }

            // Replace menu items if provided
            if (dto.menuItemIds !== undefined) {
                await tx.loyalityPointMenuItem.deleteMany({
                    where: { loyalityPointId: id },
                });
                if (dto.menuItemIds.length) {
                    await tx.loyalityPointMenuItem.createMany({
                        data: dto.menuItemIds.map((menuItemId) => ({
                            loyalityPointId: id,
                            menuItemId,
                        })),
                    });
                }
            }

            return tx.loyalityPoint.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.points !== undefined && { points: dto.points }),
                    ...(dto.startDate !== undefined && {
                        startDate: dto.startDate ? new Date(dto.startDate) : null,
                    }),
                    ...(dto.endDate !== undefined && {
                        endDate: dto.endDate ? new Date(dto.endDate) : null,
                    }),
                    ...(dto.startTime !== undefined && { startTime: dto.startTime }),
                    ...(dto.endTime !== undefined && { endTime: dto.endTime }),
                    ...(dto.maxUsagePerCustomer !== undefined && {
                        maxUsagePerCustomer: dto.maxUsagePerCustomer,
                    }),
                    ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                },
                include: this.defaultInclude,
            });
        });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(actor: User, restaurantId: string, id: string) {
        this.assertAdminOrAbove(actor);
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const record = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
        });
        if (!record) {
            throw new NotFoundException(
                `Loyalty point rule ${id} not found in restaurant ${restaurantId}`,
            );
        }

        await this.prisma.loyalityPoint.delete({ where: { id } });
        return {
            message: `Loyalty point rule "${record.name}" deleted successfully`,
        };
    }

    // ─── Permission Helpers ───────────────────────────────────────────────────

    private async assertRestaurantAccess(
        actor: User,
        restaurantId: string,
        mode: 'view' | 'manage',
    ): Promise<void> {
        if (actor.role === UserRole.SUPER_ADMIN) return;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant)
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        if (actor.role === UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new ForbiddenException('You do not own this restaurant');
            }
            return;
        }

        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException('You are not assigned to this restaurant');
        }

        if (
            mode === 'manage' &&
            (actor.role === UserRole.WAITER ||
                actor.role === UserRole.CHEF ||
                actor.role === UserRole.BILLER)
        ) {
            throw new ForbiddenException(
                'WAITER, CHEF and BILLER can only view loyalty points, not manage them',
            );
        }
    }

    private assertAdminOrAbove(actor: User): void {
        const allowed: UserRole[] = [
            UserRole.SUPER_ADMIN,
            UserRole.OWNER,
            UserRole.RESTAURANT_ADMIN,
        ];
        if (!allowed.includes(actor.role)) {
            throw new ForbiddenException(
                'Insufficient permissions to delete loyalty point rules',
            );
        }
    }
}
