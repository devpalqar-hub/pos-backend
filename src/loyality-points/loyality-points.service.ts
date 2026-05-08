import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { CreateLoyalityPointDto } from './dto/create-loyality-point.dto';
import { UpdateLoyalityPointDto } from './dto/update-loyality-point.dto';
import {
    CreateLoyalityOfferDto,
    LoyalityOfferTypeDto,
} from './dto/create-loyality-offer.dto';
import { UpdateLoyalityOfferDto } from './dto/update-loyality-offer.dto';
import { User, UserRole } from '@prisma/client';
import { isUUID } from 'class-validator';

@Injectable()
export class LoyalityPointsService {
    private readonly logger = new Logger(LoyalityPointsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ─── Shared include for reads ─────────────────────────────────────────────

    private readonly defaultInclude = {
        restaurant: { select: { id: true, name: true } },
        days: { select: { id: true, day: true } },
        categories: { select: { id: true, name: true } },
        menuItems: { select: { id: true, name: true, price: true } },
    };

    private readonly defaultOfferInclude = {
        restaurant: { select: { id: true, name: true } },
        menuItems: { select: { id: true, name: true, price: true } },
    };

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(
        actor: User,
        restaurantId: string,
        dto: CreateLoyalityPointDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        this.validateConditionAmountRange(
            dto.conditionMinAmount,
            dto.conditionMaxAmount,
        );

        return this.prisma.loyalityPoint.create({
            data: {
                restaurantId,
                name: dto.name,
                points: dto.points ?? 0,
                loyalityDiscountRatio: dto.loyalityDiscountRatio ?? null,
                conditionMinAmount: dto.conditionMinAmount ?? null,
                conditionMaxAmount: dto.conditionMaxAmount ?? null,
                isGroup: dto.isGroup ?? false,
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                startTime: dto.startTime ?? null,
                endTime: dto.endTime ?? null,
                maxUsagePerCustomer: dto.maxUsagePerCustomer ?? null,
                ...(dto.weekDays?.length && {
                    days: {
                        create: dto.weekDays.map((day) => ({ day })),
                    },
                }),
                ...(dto.categoryIds?.length && {
                    categories: {
                        connect: dto.categoryIds.map((id) => ({ id })),
                    },
                }),
                ...(dto.menuItemIds?.length && {
                    menuItems: {
                        connect: dto.menuItemIds.map((id) => ({ id })),
                    },
                }),
            },
            include: this.defaultInclude,
        });
    }

    // ─── List (paginated) ────────────────────────────────────────────────────

    private resolveType(type?: string) {
        switch (type) {
            case 'menu':
                return {
                    menuItems: {
                        some: {},
                    },
                };

            case 'category':
                return {
                    categories: {
                        some: {},
                    },
                };

            case 'time':
                return {
                    OR: [
                        { startTime: { not: null } },
                        { endTime: { not: null } },
                    ],
                };

            case 'date':
                return {
                    AND: [
                        { startDate: { not: null } },
                        { endDate: { not: null } },
                    ],
                };

            case 'day':
                return {
                    days: {
                        some: {},
                    },
                };

            default:
                return {};
        }
    }

    async findAll(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        search?: string,
        status?: string,
        type?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        return paginate({
            prismaModel: this.prisma.loyalityPoint,
            page,
            limit,
            where: {
                restaurantId,

                ...(search && {
                    name: {
                        contains: search,
                    },
                }),

                ...(status !== undefined && {
                    isActive: status === 'true',
                }),

                ...this.resolveType(type),
            },
            orderBy: [{ createdAt: 'desc' }],
            include: this.defaultInclude,
        });
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    async findOne(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const record = await this.prisma.loyalityPoint.findFirst({
            where: { id, restaurantId },
            include: this.defaultInclude,
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
        const existingRule = existing as any;

        const nextConditionMinAmount =
            dto.conditionMinAmount !== undefined
                ? dto.conditionMinAmount
                : existingRule.conditionMinAmount
                    ? Number(existingRule.conditionMinAmount)
                    : undefined;
        const nextConditionMaxAmount =
            dto.conditionMaxAmount !== undefined
                ? dto.conditionMaxAmount
                : existingRule.conditionMaxAmount
                    ? Number(existingRule.conditionMaxAmount)
                    : undefined;

        this.validateConditionAmountRange(
            nextConditionMinAmount,
            nextConditionMaxAmount,
        );

        return this.prisma.$transaction(async (tx) => {
            // ── Replace weekDays (delete old, create new) ─────────────────────
            if (dto.weekDays !== undefined) {
                await tx.loyalityPointDay.deleteMany({
                    where: { loyalityPointId: id },
                });
                if (dto.weekDays.length) {
                    await tx.loyalityPointDay.createMany({
                        data: dto.weekDays.map((day) => ({
                            loyalityPointId: id,
                            day,
                        })),
                    });
                }
            }

            return tx.loyalityPoint.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.points !== undefined && { points: dto.points }),
                    ...(dto.loyalityDiscountRatio !== undefined && { loyalityDiscountRatio: dto.loyalityDiscountRatio }),
                    ...(dto.conditionMinAmount !== undefined && {
                        conditionMinAmount: dto.conditionMinAmount,
                    }),
                    ...(dto.conditionMaxAmount !== undefined && {
                        conditionMaxAmount: dto.conditionMaxAmount,
                    }),
                    ...(dto.isGroup !== undefined && { isGroup: dto.isGroup }),
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
                    // ── Replace categories (disconnect all, reconnect) ────────
                    ...(dto.categoryIds !== undefined && {
                        categories: {
                            set: dto.categoryIds.map((cid) => ({ id: cid })),
                        },
                    }),
                    // ── Replace menu items (disconnect all, reconnect) ────────
                    ...(dto.menuItemIds !== undefined && {
                        menuItems: {
                            set: dto.menuItemIds.map((mid) => ({ id: mid })),
                        },
                    }),
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


    async getCustomerLoyalty(
        actor: User,
        restaurantId: string,
        search: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        if (!search) {
            throw new BadRequestException('Search parameter is required');
        }

        let whereCondition: any;

        // Detect type
        if (isUUID(search)) {
            whereCondition = { id: search };
        } else if (this.isEmail(search)) {
            whereCondition = { email: search };
        } else {
            whereCondition = { phone: search };
        }

        const customer = await this.prisma.customer.findFirst({
            where: {
                restaurantId,
                ...whereCondition,
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
            },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        const [earned, redeemed] = await Promise.all([
            this.prisma.loyalityPoint.aggregate({
                _sum: { points: true },
                where: {
                    restaurantId,
                    // customerId: customer.id,
                },
            }),
            this.prisma.loyalityPointRedemption.aggregate({
                _sum: { pointsAwarded: true },
                where: {
                    customerId: customer.id,
                },
            }),
        ]);

        const totalEarned = Number(earned._sum?.points ?? 0);
        const totalRedeemed = Number(redeemed._sum?.pointsAwarded ?? 0);

        return {
            customer,
            loyalty: {
                totalEarned,
                totalRedeemed,
                balance: totalEarned - totalRedeemed,
            },
        };
    }

    // ─── Offers CRUD ─────────────────────────────────────────────────────────

    async createOffer(
        actor: User,
        restaurantId: string,
        dto: CreateLoyalityOfferDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');
        await this.validateOfferPayload(restaurantId, dto.type, {
            redeemAmount: dto.redeemAmount,
            menuItemIds: dto.menuItemIds,
            validFrom: dto.validFrom,
            validTo: dto.validTo,
        });

        return (this.prisma as any).loyalityOffer.create({
            data: {
                restaurantId,
                name: dto.name,
                type: dto.type,
                pointsRequired: dto.pointsRequired,
                redeemAmount: dto.redeemAmount ?? null,
                validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
                validTo: dto.validTo ? new Date(dto.validTo) : null,
                isActive: dto.isActive ?? true,
                ...(dto.menuItemIds?.length && {
                    menuItems: {
                        connect: dto.menuItemIds.map((id) => ({ id })),
                    },
                }),
            },
            include: this.defaultOfferInclude,
        });
    }

    async findAllOffers(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        search?: string,
        status?: string,
        type?: LoyalityOfferTypeDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        return paginate({
            prismaModel: (this.prisma as any).loyalityOffer,
            page,
            limit,
            where: {
                restaurantId,
                ...(search && {
                    name: {
                        contains: search,
                    },
                }),
                ...(status !== undefined && {
                    isActive: status === 'true',
                }),
                ...(type && { type }),
            },
            orderBy: [{ createdAt: 'desc' }],
            include: this.defaultOfferInclude,
        } as any);
    }

    async findOneOffer(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const record = await (this.prisma as any).loyalityOffer.findFirst({
            where: { id, restaurantId },
            include: this.defaultOfferInclude,
        });

        if (!record) {
            throw new NotFoundException(
                `Loyalty offer ${id} not found in restaurant ${restaurantId}`,
            );
        }

        return record;
    }

    async updateOffer(
        actor: User,
        restaurantId: string,
        id: string,
        dto: UpdateLoyalityOfferDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const existing = await (this.prisma as any).loyalityOffer.findFirst({
            where: { id, restaurantId },
            include: {
                menuItems: { select: { id: true } },
            },
        });

        if (!existing) {
            throw new NotFoundException(
                `Loyalty offer ${id} not found in restaurant ${restaurantId}`,
            );
        }

        const nextType = dto.type ?? existing.type;
        const nextRedeemAmount =
            dto.redeemAmount !== undefined
                ? dto.redeemAmount
                : existing.redeemAmount !== null
                    ? Number(existing.redeemAmount)
                    : undefined;
        const nextMenuItemIds =
            dto.menuItemIds !== undefined
                ? dto.menuItemIds
                : existing.menuItems.map((m: { id: string }) => m.id);
        const nextValidFrom =
            dto.validFrom !== undefined
                ? dto.validFrom
                : existing.validFrom
                    ? new Date(existing.validFrom).toISOString()
                    : undefined;
        const nextValidTo =
            dto.validTo !== undefined
                ? dto.validTo
                : existing.validTo
                    ? new Date(existing.validTo).toISOString()
                    : undefined;

        await this.validateOfferPayload(restaurantId, nextType, {
            redeemAmount: nextRedeemAmount,
            menuItemIds: nextMenuItemIds,
            validFrom: nextValidFrom,
            validTo: nextValidTo,
        });

        return (this.prisma as any).loyalityOffer.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.type !== undefined && { type: dto.type }),
                ...(dto.pointsRequired !== undefined && {
                    pointsRequired: dto.pointsRequired,
                }),
                ...(dto.redeemAmount !== undefined && {
                    redeemAmount: dto.redeemAmount,
                }),
                ...(dto.menuItemIds !== undefined && {
                    menuItems: {
                        set: dto.menuItemIds.map((id) => ({ id })),
                    },
                }),
                ...(dto.type === LoyalityOfferTypeDto.AMOUNT &&
                    dto.menuItemIds === undefined && {
                    menuItems: {
                        set: [],
                    },
                }),
                ...(dto.validFrom !== undefined && {
                    validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
                }),
                ...(dto.validTo !== undefined && {
                    validTo: dto.validTo ? new Date(dto.validTo) : null,
                }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: this.defaultOfferInclude,
        });
    }

    async removeOffer(actor: User, restaurantId: string, id: string) {
        this.assertAdminOrAbove(actor);
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const record = await (this.prisma as any).loyalityOffer.findFirst({
            where: { id, restaurantId },
        });

        if (!record) {
            throw new NotFoundException(
                `Loyalty offer ${id} not found in restaurant ${restaurantId}`,
            );
        }

        await (this.prisma as any).loyalityOffer.delete({ where: { id } });

        return {
            message: `Loyalty offer "${record.name}" deleted successfully`,
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

    private isEmail(value: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    private validateConditionAmountRange(
        conditionMinAmount?: number,
        conditionMaxAmount?: number,
    ): void {
        if (
            conditionMinAmount !== undefined &&
            conditionMaxAmount !== undefined &&
            conditionMinAmount > conditionMaxAmount
        ) {
            throw new BadRequestException(
                'conditionMinAmount cannot be greater than conditionMaxAmount',
            );
        }
    }

    private async validateOfferPayload(
        restaurantId: string,
        type: LoyalityOfferTypeDto,
        payload: {
            redeemAmount?: number;
            menuItemIds?: string[];
            validFrom?: string;
            validTo?: string;
        },
    ): Promise<void> {
        if (payload.validFrom && payload.validTo) {
            const validFrom = new Date(payload.validFrom);
            const validTo = new Date(payload.validTo);
            if (validFrom > validTo) {
                throw new BadRequestException(
                    'validFrom cannot be greater than validTo',
                );
            }
        }

        if (type === LoyalityOfferTypeDto.AMOUNT) {
            if (payload.redeemAmount === undefined || payload.redeemAmount <= 0) {
                throw new BadRequestException(
                    'redeemAmount is required and must be positive when type is AMOUNT',
                );
            }
            return;
        }

        if (!payload.menuItemIds?.length) {
            throw new BadRequestException(
                'menuItemIds is required when type is FOOD',
            );
        }

        const menuItems = await this.prisma.menuItem.findMany({
            where: {
                id: {
                    in: payload.menuItemIds,
                },
                restaurantId,
            },
            select: { id: true },
        });

        if (menuItems.length !== payload.menuItemIds.length) {
            throw new NotFoundException(
                `One or more menu items were not found in restaurant ${restaurantId}`,
            );
        }
    }

    // ─── Scheduled Task: Deactivate Expired Loyalty Points ─────────────────────

    /**
     * Runs every minute.
     * Automatically sets isActive = false for loyalty points where endDate has passed.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async deactivateExpiredLoyaltyPoints(): Promise<void> {
        try {
            this.logger.log('🔄 CRON: Starting deactivation of expired loyalty points...');

            const now = new Date();
            const updated = await this.prisma.loyalityPoint.updateMany({
                where: {
                    isActive: true,
                    endDate: {
                        lt: now,
                    },
                },
                data: {
                    isActive: false,
                },
            });

            if (updated.count > 0) {
                this.logger.log(
                    `✅ CRON: ${updated.count} expired loyalty point(s) deactivated successfully`,
                );
            } else {
                this.logger.log('ℹ️  CRON: No expired loyalty points to deactivate');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `❌ CRON: Error deactivating expired loyalty points: ${errorMessage}`,
                errorStack,
            );
        }
    }

    // ─── Scheduled Task: Deactivate Expired Loyalty Offers ────────────────────

    /**
     * Runs every minute.
     * Automatically sets isActive = false for loyalty offers where validTo has passed.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async deactivateExpiredLoyaltyOffers(): Promise<void> {
        try {
            this.logger.log('🔄 CRON: Starting deactivation of expired loyalty offers...');

            const now = new Date();
            const updated = await this.prisma.loyalityOffer.updateMany({
                where: {
                    isActive: true,
                    validTo: {
                        lt: now,
                    },
                },
                data: {
                    isActive: false,
                },
            });

            if (updated.count > 0) {
                this.logger.log(
                    `✅ CRON: ${updated.count} expired loyalty offer(s) deactivated successfully`,
                );
            } else {
                this.logger.log('ℹ️  CRON: No expired loyalty offers to deactivate');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(
                `❌ CRON: Error deactivating expired loyalty offers: ${errorMessage}`,
                errorStack,
            );
        }
    }
}
