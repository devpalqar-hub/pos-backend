import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { AssignStaffDto, RemoveStaffDto } from './dto/assign-staff.dto';
import { User, UserRole } from '../../generated/prisma';

// ─── Full include clause reused across queries ─────────────────────────────────

const RESTAURANT_INCLUDE = {
    owner: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true, email: true } },
    workingHours: {
        orderBy: { day: 'asc' as const },
        select: {
            id: true,
            day: true,
            openTime: true,
            closeTime: true,
            isClosed: true,
        },
    },
    staff: {
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
        },
    },
} as const;

// Lightweight include for listings
const RESTAURANT_LIST_INCLUDE = {
    owner: { select: { id: true, name: true, email: true } },
    workingHours: {
        select: { day: true, openTime: true, closeTime: true, isClosed: true },
    },
    _count: { select: { staff: true } },
} as const;

@Injectable()
export class RestaurantsService {
    private readonly logger = new Logger(RestaurantsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ─── Create Restaurant (SUPER_ADMIN only) ─────────────────────────────────

    async create(actor: User, dto: CreateRestaurantDto): Promise<object> {
        // Verify the target owner exists and has the OWNER role
        const owner = await this.prisma.user.findUnique({
            where: { id: dto.ownerId },
        });
        if (!owner) {
            throw new NotFoundException(`Owner with id ${dto.ownerId} not found`);
        }
        if (owner.role !== UserRole.OWNER) {
            throw new BadRequestException(
                `User ${dto.ownerId} does not have the OWNER role. Only OWNER users can own restaurants.`,
            );
        }
        if (!owner.isActive) {
            throw new BadRequestException(`Owner account is deactivated`);
        }

        // Build unique slug
        const slug = dto.slug ?? this.buildSlug(dto.name);
        await this.assertSlugAvailable(slug);

        const { workingHours, ...restDto } = dto;

        const restaurant = await this.prisma.restaurant.create({
            data: {
                name: restDto.name,
                slug,
                description: restDto.description ?? null,
                ownerId: restDto.ownerId,
                createdById: actor.id,
                phone: restDto.phone ?? null,
                email: restDto.email ?? null,
                website: restDto.website ?? null,
                address: restDto.address ?? null,
                city: restDto.city ?? null,
                state: restDto.state ?? null,
                country: restDto.country ?? null,
                postalCode: restDto.postalCode ?? null,
                latitude: restDto.latitude ?? null,
                longitude: restDto.longitude ?? null,
                logoUrl: restDto.logoUrl ?? null,
                coverUrl: restDto.coverUrl ?? null,
                cuisineType: restDto.cuisineType ?? null,
                maxCapacity: restDto.maxCapacity ?? null,
                taxRate: restDto.taxRate ?? null,
                currency: restDto.currency ?? 'USD',
                workingHours: workingHours?.length
                    ? {
                        create: workingHours.map((wh) => ({
                            day: wh.day,
                            openTime: wh.openTime ?? null,
                            closeTime: wh.closeTime ?? null,
                            isClosed: wh.isClosed ?? false,
                        })),
                    }
                    : undefined,
            },
            include: RESTAURANT_INCLUDE,
        });

        return restaurant;
    }

    // ─── List Restaurants ─────────────────────────────────────────────────────

    async findAll(actor: User): Promise<object[]> {
        switch (actor.role) {
            case UserRole.SUPER_ADMIN:
                return this.prisma.restaurant.findMany({
                    include: RESTAURANT_LIST_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                });

            case UserRole.OWNER:
                return this.prisma.restaurant.findMany({
                    where: { ownerId: actor.id },
                    include: RESTAURANT_LIST_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                });

            case UserRole.RESTAURANT_ADMIN:
            case UserRole.WAITER:
            case UserRole.CHEF:
                if (!actor.restaurantId) return [];
                return this.prisma.restaurant.findMany({
                    where: { id: actor.restaurantId },
                    include: RESTAURANT_LIST_INCLUDE,
                });

            default:
                return [];
        }
    }

    // ─── Get Single Restaurant ─────────────────────────────────────────────────

    async findOne(actor: User, id: string): Promise<object> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
            include: RESTAURANT_INCLUDE,
        });

        if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);

        this.assertCanViewRestaurant(actor, restaurant);
        return this.filterResponse(actor.role, restaurant);
    }

    // ─── Update Restaurant ─────────────────────────────────────────────────────

    async update(
        actor: User,
        id: string,
        dto: UpdateRestaurantDto,
    ): Promise<object> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);

        this.assertCanEditRestaurant(actor, restaurant);

        // Only SUPER_ADMIN can transfer ownership
        if (dto.ownerId !== undefined && actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only Super Admin can transfer restaurant ownership');
        }

        if (dto.ownerId) {
            const newOwner = await this.prisma.user.findUnique({
                where: { id: dto.ownerId },
            });
            if (!newOwner) throw new NotFoundException(`User ${dto.ownerId} not found`);
            if (newOwner.role !== UserRole.OWNER) {
                throw new BadRequestException('The target user must have the OWNER role');
            }
        }

        // Only SUPER_ADMIN / OWNER can toggle isActive
        if (
            dto.isActive !== undefined &&
            !([UserRole.SUPER_ADMIN, UserRole.OWNER] as UserRole[]).includes(actor.role)
        ) {
            throw new ForbiddenException('Only Super Admin or Owner can activate/deactivate a restaurant');
        }

        if (dto.slug && dto.slug !== restaurant.slug) {
            await this.assertSlugAvailable(dto.slug);
        }

        const { workingHours, ...restDto } = dto;

        const updated = await this.prisma.restaurant.update({
            where: { id },
            data: {
                ...(restDto.name !== undefined && { name: restDto.name }),
                ...(restDto.slug !== undefined && { slug: restDto.slug }),
                ...(restDto.description !== undefined && { description: restDto.description }),
                ...(restDto.ownerId !== undefined && { ownerId: restDto.ownerId }),
                ...(restDto.phone !== undefined && { phone: restDto.phone }),
                ...(restDto.email !== undefined && { email: restDto.email }),
                ...(restDto.website !== undefined && { website: restDto.website }),
                ...(restDto.address !== undefined && { address: restDto.address }),
                ...(restDto.city !== undefined && { city: restDto.city }),
                ...(restDto.state !== undefined && { state: restDto.state }),
                ...(restDto.country !== undefined && { country: restDto.country }),
                ...(restDto.postalCode !== undefined && { postalCode: restDto.postalCode }),
                ...(restDto.latitude !== undefined && { latitude: restDto.latitude }),
                ...(restDto.longitude !== undefined && { longitude: restDto.longitude }),
                ...(restDto.logoUrl !== undefined && { logoUrl: restDto.logoUrl }),
                ...(restDto.coverUrl !== undefined && { coverUrl: restDto.coverUrl }),
                ...(restDto.cuisineType !== undefined && { cuisineType: restDto.cuisineType }),
                ...(restDto.maxCapacity !== undefined && { maxCapacity: restDto.maxCapacity }),
                ...(restDto.taxRate !== undefined && { taxRate: restDto.taxRate }),
                ...(restDto.currency !== undefined && { currency: restDto.currency }),
                ...(restDto.isActive !== undefined && { isActive: restDto.isActive }),
            },
            include: RESTAURANT_INCLUDE,
        });

        // Upsert working hours if provided
        if (workingHours?.length) {
            await this.upsertWorkingHours(id, workingHours);
            return this.prisma.restaurant.findUnique({
                where: { id },
                include: RESTAURANT_INCLUDE,
            }) as Promise<object>;
        }

        return this.filterResponse(actor.role, updated);
    }

    // ─── Delete Restaurant (SUPER_ADMIN only) ─────────────────────────────────

    async remove(actor: User, id: string): Promise<{ message: string }> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${id} not found`);

        if (actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only Super Admin can delete restaurants');
        }

        // Unassign all staff before deleting
        await this.prisma.user.updateMany({
            where: { restaurantId: id },
            data: { restaurantId: null },
        });

        await this.prisma.restaurant.delete({ where: { id } });

        this.logger.log(`Restaurant ${restaurant.name} (${id}) deleted by ${actor.email}`);
        return { message: `Restaurant "${restaurant.name}" has been deleted` };
    }

    // ─── Assign Staff to Restaurant ───────────────────────────────────────────

    async assignStaff(
        actor: User,
        restaurantId: string,
        dto: AssignStaffDto,
    ): Promise<object> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        this.assertCanManageStaff(actor, restaurant);

        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

        if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OWNER) {
            throw new BadRequestException(
                `Cannot assign SUPER_ADMIN or OWNER users to a restaurant as staff`,
            );
        }

        // OWNER can only assign staff to their own restaurants
        if (actor.role === UserRole.OWNER && restaurant.ownerId !== actor.id) {
            throw new ForbiddenException('You can only assign staff to your own restaurants');
        }

        // RESTAURANT_ADMIN can only assign to their own restaurant
        if (
            actor.role === UserRole.RESTAURANT_ADMIN &&
            actor.restaurantId !== restaurantId
        ) {
            throw new ForbiddenException('You can only assign staff to your assigned restaurant');
        }

        const updated = await this.prisma.user.update({
            where: { id: dto.userId },
            data: { restaurantId },
            select: { id: true, name: true, email: true, role: true, restaurantId: true },
        });

        return {
            message: `${user.name} has been assigned to ${restaurant.name}`,
            user: updated,
        };
    }

    // ─── Remove Staff from Restaurant ─────────────────────────────────────────

    async removeStaff(
        actor: User,
        restaurantId: string,
        dto: RemoveStaffDto,
    ): Promise<object> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        this.assertCanManageStaff(actor, restaurant);

        const user = await this.prisma.user.findUnique({
            where: { id: dto.userId },
        });
        if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

        if (user.restaurantId !== restaurantId) {
            throw new BadRequestException(
                `User ${user.name} is not assigned to this restaurant`,
            );
        }

        await this.prisma.user.update({
            where: { id: dto.userId },
            data: { restaurantId: null },
        });

        return {
            message: `${user.name} has been removed from ${restaurant.name}`,
        };
    }

    // ─── Get Staff List ───────────────────────────────────────────────────────

    async getStaff(actor: User, restaurantId: string): Promise<object[]> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        this.assertCanViewRestaurant(actor, restaurant);

        return this.prisma.user.findMany({
            where: { restaurantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    // ─── Get Working Hours ────────────────────────────────────────────────────

    async getWorkingHours(actor: User, restaurantId: string): Promise<object[]> {
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        this.assertCanViewRestaurant(actor, restaurant);

        return this.prisma.workingHours.findMany({
            where: { restaurantId },
            orderBy: { day: 'asc' },
            select: { id: true, day: true, openTime: true, closeTime: true, isClosed: true },
        });
    }

    // ─── Permission Helpers ───────────────────────────────────────────────────

    private assertCanViewRestaurant(actor: User, restaurant: any): void {
        if (actor.role === UserRole.SUPER_ADMIN) return;
        if (actor.role === UserRole.OWNER && restaurant.ownerId === actor.id) return;
        if (
            [UserRole.RESTAURANT_ADMIN, UserRole.WAITER, UserRole.CHEF].includes(actor.role) &&
            actor.restaurantId === restaurant.id
        ) return;
        throw new ForbiddenException('You do not have access to this restaurant');
    }

    private assertCanEditRestaurant(actor: User, restaurant: any): void {
        if (actor.role === UserRole.SUPER_ADMIN) return;
        if (actor.role === UserRole.OWNER && restaurant.ownerId === actor.id) return;
        if (
            actor.role === UserRole.RESTAURANT_ADMIN &&
            actor.restaurantId === restaurant.id
        ) return;
        throw new ForbiddenException('You do not have permission to edit this restaurant');
    }

    private assertCanManageStaff(actor: User, restaurant: any): void {
        if (actor.role === UserRole.SUPER_ADMIN) return;
        if (actor.role === UserRole.OWNER && restaurant.ownerId === actor.id) return;
        if (
            actor.role === UserRole.RESTAURANT_ADMIN &&
            actor.restaurantId === restaurant.id
        ) return;
        throw new ForbiddenException('You do not have permission to manage staff for this restaurant');
    }

    // ─── Utilities ────────────────────────────────────────────────────────────

    private buildSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            + '-' + Date.now().toString(36);
    }

    private async assertSlugAvailable(slug: string): Promise<void> {
        const existing = await this.prisma.restaurant.findUnique({ where: { slug } });
        if (existing) {
            throw new ConflictException(`Slug "${slug}" is already in use. Please choose a different slug.`);
        }
    }

    private async upsertWorkingHours(
        restaurantId: string,
        hours: Array<{
            day: string;
            openTime?: string;
            closeTime?: string;
            isClosed?: boolean;
        }>,
    ): Promise<void> {
        await Promise.all(
            hours.map((wh) =>
                this.prisma.workingHours.upsert({
                    where: { restaurantId_day: { restaurantId, day: wh.day as any } },
                    create: {
                        restaurantId,
                        day: wh.day as any,
                        openTime: wh.openTime ?? null,
                        closeTime: wh.closeTime ?? null,
                        isClosed: wh.isClosed ?? false,
                    },
                    update: {
                        openTime: wh.openTime ?? null,
                        closeTime: wh.closeTime ?? null,
                        isClosed: wh.isClosed ?? false,
                    },
                }),
            ),
        );
    }

    // ─── Response filter ──────────────────────────────────────────────────────
    // RESTAURANT_ADMIN / WAITER / CHEF don't see staff count or creation metadata

    private filterResponse(role: UserRole, restaurant: any): object {
        if (role === UserRole.SUPER_ADMIN || role === UserRole.OWNER) {
            return restaurant;
        }

        // Staff see everything except internal metadata
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { createdBy, createdById, ...safe } = restaurant;
        return safe;
    }
}
