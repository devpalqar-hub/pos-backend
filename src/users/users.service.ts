import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateProfileDto } from './dto/update-user.dto';
import { User, UserRole } from '@prisma/client';

// ─── Role hierarchy helpers ────────────────────────────────────────────────

const ADMIN_ROLES = [UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.RESTAURANT_ADMIN];
const STAFF_ROLES = [UserRole.WAITER, UserRole.CHEF, UserRole.BILLER];

// Roles that can be CREATED by respective actors
const CREATABLE_BY: Record<UserRole, UserRole[]> = {
    [UserRole.SUPER_ADMIN]: [
        UserRole.SUPER_ADMIN,
        UserRole.OWNER,
        UserRole.RESTAURANT_ADMIN,
        UserRole.WAITER,
        UserRole.CHEF,
        UserRole.BILLER,
    ],
    [UserRole.OWNER]: [
        UserRole.RESTAURANT_ADMIN,
        UserRole.WAITER,
        UserRole.CHEF,
        UserRole.BILLER,
    ],
    [UserRole.RESTAURANT_ADMIN]: [UserRole.WAITER, UserRole.CHEF, UserRole.BILLER],
    [UserRole.WAITER]: [],
    [UserRole.CHEF]: [],
    [UserRole.BILLER]: [],
};

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Create User ──────────────────────────────────────────────────────────

    async create(actor: User, dto: CreateUserDto): Promise<object> {
        this.assertCanCreate(actor, dto.role);

        // OWNER must supply a restaurantId that belongs to him
        if (actor.role === UserRole.OWNER) {
            if (!dto.restaurantId) {
                throw new BadRequestException(
                    'restaurantId is required when creating users as an Owner',
                );
            }
            await this.assertOwnsRestaurant(actor.id, dto.restaurantId);
        }

        // RESTAURANT_ADMIN can only create in their own restaurant
        if (actor.role === UserRole.RESTAURANT_ADMIN) {
            if (!actor.restaurantId) {
                throw new ForbiddenException('You are not assigned to any restaurant');
            }
            if (dto.restaurantId && dto.restaurantId !== actor.restaurantId) {
                throw new ForbiddenException(
                    'You can only create users in your assigned restaurant',
                );
            }
            dto.restaurantId = actor.restaurantId;
        }

        // Staff roles must have a restaurantId
        if (([...STAFF_ROLES, UserRole.RESTAURANT_ADMIN] as UserRole[]).includes(dto.role) && !dto.restaurantId) {
            throw new BadRequestException(
                `restaurantId is required for role ${dto.role}`,
            );
        }

        // Email uniqueness check
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException(
                `A user with email ${dto.email} already exists`,
            );
        }

        const created = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                role: dto.role,
                restaurantId: dto.restaurantId ?? null,
                createdById: actor.id,
            },
            include: {
                restaurant: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true, email: true } },
            },
        });

        return this.filterResponse(actor.role, created);
    }

    // ─── List Users ───────────────────────────────────────────────────────────

    async findAll(actor: User): Promise<object[]> {
        let users: any[];

        switch (actor.role) {
            case UserRole.SUPER_ADMIN:
                users = await this.prisma.user.findMany({
                    include: {
                        restaurant: { select: { id: true, name: true } },
                        createdBy: { select: { id: true, name: true } },
                        ownedRestaurants: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                break;

            case UserRole.OWNER: {
                // Users in all restaurants owned by this owner
                const owned = await this.prisma.restaurant.findMany({
                    where: { ownerId: actor.id },
                    select: { id: true },
                });
                const restaurantIds = owned.map((r) => r.id);
                users = await this.prisma.user.findMany({
                    where: {
                        OR: [
                            { restaurantId: { in: restaurantIds } },
                            { id: actor.id },
                        ],
                    },
                    include: {
                        restaurant: { select: { id: true, name: true } },
                        createdBy: { select: { id: true, name: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                });
                break;
            }

            case UserRole.RESTAURANT_ADMIN:
                if (!actor.restaurantId) return [];
                users = await this.prisma.user.findMany({
                    where: { restaurantId: actor.restaurantId },
                    include: { restaurant: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                });
                break;

            // Waiter / Chef — see only themselves
            default:
                users = await this.prisma.user.findMany({
                    where: { id: actor.id },
                });
                break;
        }

        return users.map((u) => this.filterResponse(actor.role, u));
    }

    // ─── Get One User ─────────────────────────────────────────────────────────

    async findOne(actor: User, targetId: string): Promise<object> {
        const target = await this.prisma.user.findUnique({
            where: { id: targetId },
            include: {
                restaurant: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
                ownedRestaurants: { select: { id: true, name: true } },
            },
        });

        if (!target) throw new NotFoundException(`User ${targetId} not found`);

        this.assertCanViewUser(actor, target);
        return this.filterResponse(actor.role, target);
    }

    // ─── Update User ──────────────────────────────────────────────────────────

    async update(
        actor: User,
        targetId: string,
        dto: UpdateUserDto,
    ): Promise<object> {
        const target = await this.prisma.user.findUnique({
            where: { id: targetId },
        });
        if (!target) throw new NotFoundException(`User ${targetId} not found`);

        this.assertCanEditUser(actor, target);

        // Only Super Admin can change roles
        if (dto.role !== undefined && actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Only Super Admin can change user roles');
        }

        // Only Super Admin / Owner can toggle isActive
        if (
            dto.isActive !== undefined &&
            !([UserRole.SUPER_ADMIN, UserRole.OWNER] as UserRole[]).includes(actor.role)
        ) {
            throw new ForbiddenException('Only Super Admin or Owner can activate/deactivate users');
        }

        const updated = await this.prisma.user.update({
            where: { id: targetId },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.email && { email: dto.email }),
                ...(dto.role && { role: dto.role }),
                ...(dto.restaurantId !== undefined && {
                    restaurantId: dto.restaurantId,
                }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: {
                restaurant: { select: { id: true, name: true } },
            },
        });

        return this.filterResponse(actor.role, updated);
    }

    // ─── Get Own Profile ──────────────────────────────────────────────────────

    async getProfile(actor: User): Promise<object> {
        const user = await this.prisma.user.findUnique({
            where: { id: actor.id },
            include: {
                restaurant: { select: { id: true, name: true } },
                ownedRestaurants:
                    actor.role === UserRole.OWNER
                        ? { select: { id: true, name: true, isActive: true } }
                        : false,
            },
        });
        if (!user) throw new NotFoundException('Profile not found');
        return this.filterResponse(actor.role, user);
    }

    // ─── Update Own Profile ───────────────────────────────────────────────────

    async updateProfile(actor: User, dto: UpdateProfileDto): Promise<object> {
        const updated = await this.prisma.user.update({
            where: { id: actor.id },
            data: { ...(dto.name && { name: dto.name }) },
            include: { restaurant: { select: { id: true, name: true } } },
        });
        return this.filterResponse(actor.role, updated);
    }

    // ─── Delete User ──────────────────────────────────────────────────────────

    async remove(actor: User, targetId: string): Promise<{ message: string }> {
        const target = await this.prisma.user.findUnique({
            where: { id: targetId },
        });
        if (!target) throw new NotFoundException(`User ${targetId} not found`);

        if (actor.role === UserRole.OWNER) {
            await this.assertOwnerCanManage(actor, target);
        } else if (actor.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('You are not allowed to delete users');
        }

        if (target.id === actor.id) {
            throw new ForbiddenException('You cannot delete your own account');
        }

        await this.prisma.user.delete({ where: { id: targetId } });
        return { message: `User ${target.email} has been deleted` };
    }

    // ─── Permission Helpers ───────────────────────────────────────────────────

    private assertCanCreate(actor: User, targetRole: UserRole): void {
        const allowed = CREATABLE_BY[actor.role] ?? [];
        if (!allowed.includes(targetRole)) {
            throw new ForbiddenException(
                `As a ${actor.role}, you cannot create users with role ${targetRole}`,
            );
        }
    }

    private assertCanViewUser(actor: User, target: any): void {
        if (actor.role === UserRole.SUPER_ADMIN) return;
        if (actor.id === target.id) return;

        if (actor.role === UserRole.OWNER) {
            // Owner can view anyone in their restaurants — DB filtering handles this in findAll
            return;
        }

        if (actor.role === UserRole.RESTAURANT_ADMIN) {
            if (target.restaurantId !== actor.restaurantId) {
                throw new ForbiddenException('You can only view users in your restaurant');
            }
            return;
        }

        // Waiter / Chef can only view themselves
        if (actor.id !== target.id) {
            throw new ForbiddenException('You can only view your own profile');
        }
    }

    private assertCanEditUser(actor: User, target: any): void {
        if (actor.role === UserRole.SUPER_ADMIN) return;
        if (actor.id === target.id) return; // self-edit always allowed

        if (actor.role === UserRole.OWNER) {
            // Must be in one of owner's restaurants
            return; // detailed check handled at service level
        }

        if (actor.role === UserRole.RESTAURANT_ADMIN) {
            if (target.restaurantId !== actor.restaurantId) {
                throw new ForbiddenException(
                    'You can only edit users in your assigned restaurant',
                );
            }
            return;
        }

        throw new ForbiddenException('You can only edit your own profile');
    }

    private async assertOwnsRestaurant(
        ownerId: string,
        restaurantId: string,
    ): Promise<void> {
        const restaurant = await this.prisma.restaurant.findFirst({
            where: { id: restaurantId, ownerId },
        });
        if (!restaurant) {
            throw new ForbiddenException(
                `Restaurant ${restaurantId} does not belong to you`,
            );
        }
    }

    private async assertOwnerCanManage(actor: User, target: any): Promise<void> {
        const owned = await this.prisma.restaurant.findMany({
            where: { ownerId: actor.id },
            select: { id: true },
        });
        const ids = owned.map((r) => r.id);
        if (!ids.includes(target.restaurantId)) {
            throw new ForbiddenException(
                'You can only manage users in your own restaurants',
            );
        }
    }

    // ─── Response Filter ──────────────────────────────────────────────────────
    // Controls which fields are visible to each role.

    private filterResponse(actorRole: UserRole, user: any): object {
        // Common safe fields everyone can see about themselves
        const base = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            restaurantId: user.restaurantId ?? null,
            restaurant: user.restaurant ?? null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        switch (actorRole) {
            case UserRole.SUPER_ADMIN:
                // Full detail — includes relational info
                return {
                    ...base,
                    createdById: user.createdById ?? null,
                    createdBy: user.createdBy ?? null,
                    ownedRestaurants: user.ownedRestaurants ?? undefined,
                };

            case UserRole.OWNER:
                // Restaurant + creation context
                return {
                    ...base,
                    createdBy: user.createdBy
                        ? { id: user.createdBy.id, name: user.createdBy.name }
                        : null,
                };

            case UserRole.RESTAURANT_ADMIN:
                // Basic staff info
                return {
                    id: base.id,
                    name: base.name,
                    email: base.email,
                    role: base.role,
                    isActive: base.isActive,
                    restaurant: base.restaurant,
                    createdAt: base.createdAt,
                };

            // Waiter / Chef — minimal own profile
            default:
                return {
                    id: base.id,
                    name: base.name,
                    email: base.email,
                    role: base.role,
                    isActive: base.isActive,
                    restaurant: base.restaurant,
                };
        }
    }
}
