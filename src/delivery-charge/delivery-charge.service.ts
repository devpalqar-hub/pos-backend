import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';
import { UpsertDeliveryChargeDto } from './dto/upsert-delivery-charge.dto';

@Injectable()
export class DeliveryChargeService {
    constructor(private readonly prisma: PrismaService) { }

    private async assertRestaurantAccess(actor: User, restaurantId: string): Promise<void> {
        if (actor.role === UserRole.SUPER_ADMIN) return;

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { id: true, ownerId: true },
        });

        if (!restaurant) {
            throw new NotFoundException(`Restaurant ${restaurantId} not found`);
        }

        if (actor.role === UserRole.OWNER) {
            if (restaurant.ownerId !== actor.id) {
                throw new ForbiddenException('You do not own this restaurant');
            }
            return;
        }

        if (actor.restaurantId !== restaurantId) {
            throw new ForbiddenException('You are not assigned to this restaurant');
        }
    }

    async getDeliveryCharge(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const charge = await this.prisma.restaurantDeliveryCharge.findUnique({
            where: { restaurantId },
        });

        return {
            restaurantId,
            deliveryCharge: charge?.deliveryCharge ?? '0.00',
            isConfigured: !!charge,
            updatedAt: charge?.updatedAt ?? null,
        };
    }

    async upsertDeliveryCharge(
        actor: User,
        restaurantId: string,
        dto: UpsertDeliveryChargeDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        await this.prisma.restaurantDeliveryCharge.upsert({
            where: { restaurantId },
            create: {
                restaurantId,
                deliveryCharge: dto.deliveryCharge,
            },
            update: {
                deliveryCharge: dto.deliveryCharge,
            },
        });

        return this.getDeliveryCharge(actor, restaurantId);
    }
}
