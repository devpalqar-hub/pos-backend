import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/utlility/pagination.util';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class CustomersService {
    constructor(private readonly prisma: PrismaService) { }

    // ─── Create ───────────────────────────────────────────────────────────────

    async create(actor: User, restaurantId: string, dto: CreateCustomerDto) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        // Phone must be unique within the restaurant
        const existing = await this.prisma.customer.findUnique({
            where: { restaurantId_phone: { restaurantId, phone: dto.phone } },
        });
        if (existing) {
            throw new ConflictException(
                `Customer with phone "${dto.phone}" already exists in this restaurant`,
            );
        }

        return this.prisma.customer.create({
            data: {
                restaurantId,
                phone: dto.phone,
                name: dto.name ?? null,
            },
        });
    }

    // ─── List (paginated) ────────────────────────────────────────────────────

    async findAll(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        search?: string,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const where: any = { restaurantId };
        if (search) {
            where.OR = [
                { name: { contains: search } },
                { phone: { contains: search } },
            ];
        }

        return paginate({
            prismaModel: this.prisma.customer,
            page,
            limit,
            where,
            orderBy: [{ createdAt: 'desc' }],
        });
    }

    // ─── Get One ──────────────────────────────────────────────────────────────

    async findOne(actor: User, restaurantId: string, id: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const customer = await this.prisma.customer.findFirst({
            where: { id, restaurantId },
            include: {
                LoyalityPointRedemption: {
                    orderBy: { redeemedAt: 'desc' },
                    take: 20,
                    include: { loyalityPoint: { select: { id: true, name: true } } },
                },
            },
        });

        if (!customer) {
            throw new NotFoundException(
                `Customer ${id} not found in restaurant ${restaurantId}`,
            );
        }

        return customer;
    }

    // ─── Get by Phone ─────────────────────────────────────────────────────────

    async findByPhone(actor: User, restaurantId: string, phone: string) {
        await this.assertRestaurantAccess(actor, restaurantId, 'view');

        const customer = await this.prisma.customer.findUnique({
            where: { restaurantId_phone: { restaurantId, phone } },
            include: {
                LoyalityPointRedemption: {
                    orderBy: { redeemedAt: 'desc' },
                    take: 20,
                    include: { loyalityPoint: { select: { id: true, name: true } } },
                },
            },
        });

        if (!customer) {
            throw new NotFoundException(
                `Customer with phone "${phone}" not found in restaurant ${restaurantId}`,
            );
        }

        return customer;
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    async update(
        actor: User,
        restaurantId: string,
        id: string,
        dto: UpdateCustomerDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const customer = await this.prisma.customer.findFirst({
            where: { id, restaurantId },
        });
        if (!customer) {
            throw new NotFoundException(
                `Customer ${id} not found in restaurant ${restaurantId}`,
            );
        }

        // Phone uniqueness check (only when changing phone)
        if (dto.phone && dto.phone !== customer.phone) {
            const conflict = await this.prisma.customer.findUnique({
                where: { restaurantId_phone: { restaurantId, phone: dto.phone } },
            });
            if (conflict) {
                throw new ConflictException(
                    `Customer with phone "${dto.phone}" already exists in this restaurant`,
                );
            }
        }

        return this.prisma.customer.update({
            where: { id },
            data: {
                ...(dto.phone !== undefined && { phone: dto.phone }),
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
        });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    async remove(actor: User, restaurantId: string, id: string) {
        this.assertAdminOrAbove(actor);
        await this.assertRestaurantAccess(actor, restaurantId, 'manage');

        const customer = await this.prisma.customer.findFirst({
            where: { id, restaurantId },
        });
        if (!customer) {
            throw new NotFoundException(
                `Customer ${id} not found in restaurant ${restaurantId}`,
            );
        }

        await this.prisma.customer.delete({ where: { id } });
        return { message: `Customer "${customer.name ?? customer.phone}" deleted successfully` };
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

        // Staff must be assigned to this restaurant
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
                'WAITER, CHEF and BILLER can only view customers, not manage them',
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
                'Insufficient permissions to delete customers',
            );
        }
    }
}
