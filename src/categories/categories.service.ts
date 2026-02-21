import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../common/services/s3.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User, UserRole } from '../../generated/prisma';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(actor: User, restaurantId: string, dto: CreateCategoryDto) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    // Category name must be unique within the restaurant
    const existing = await this.prisma.menuCategory.findUnique({
      where: { restaurantId_name: { restaurantId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Category "${dto.name}" already exists in this restaurant`,
      );
    }

    return this.prisma.menuCategory.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
        createdById: actor.id,
      },
      include: { _count: { select: { items: true } } },
    });
  }

  // ─── List (for a restaurant) ──────────────────────────────────────────────

  async findAll(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'view');

    return this.prisma.menuCategory.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { items: true } } },
    });
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  async findOne(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'view');

    const category = await this.prisma.menuCategory.findFirst({
      where: { id, restaurantId },
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            price: true,
            discountedPrice: true,
            imageUrl: true,
            itemType: true,
            isOutOfStock: true,
            isAvailable: true,
            stockCount: true,
          },
        },
        _count: { select: { items: true } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${id} not found in restaurant ${restaurantId}`);
    }

    return category;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    actor: User,
    restaurantId: string,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const category = await this.prisma.menuCategory.findFirst({
      where: { id, restaurantId },
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found in restaurant ${restaurantId}`);
    }

    // Name uniqueness check (only when changing name)
    if (dto.name && dto.name !== category.name) {
      const conflict = await this.prisma.menuCategory.findUnique({
        where: { restaurantId_name: { restaurantId, name: dto.name } },
      });
      if (conflict) {
        throw new ConflictException(`Category "${dto.name}" already exists in this restaurant`);
      }
    }

    // If a new imageUrl is provided and the old one exists, delete old S3 object
    if (dto.imageUrl && category.imageUrl && dto.imageUrl !== category.imageUrl) {
      await this.s3.deleteByUrl(category.imageUrl);
    }

    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { _count: { select: { items: true } } },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(actor: User, restaurantId: string, id: string) {
    this.assertAdminOrAbove(actor);
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const category = await this.prisma.menuCategory.findFirst({
      where: { id, restaurantId },
      include: { _count: { select: { items: true } } },
    });
    if (!category) {
      throw new NotFoundException(`Category ${id} not found in restaurant ${restaurantId}`);
    }

    if (category._count.items > 0) {
      throw new ForbiddenException(
        `Cannot delete category "${category.name}" — it has ${category._count.items} menu item(s). ` +
          `Move or delete the items first.`,
      );
    }

    // Delete S3 image if present
    if (category.imageUrl) await this.s3.deleteByUrl(category.imageUrl);

    await this.prisma.menuCategory.delete({ where: { id } });
    return { message: `Category "${category.name}" deleted successfully` };
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
    if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

    if (actor.role === UserRole.OWNER) {
      if (restaurant.ownerId !== actor.id) {
        throw new ForbiddenException('You do not own this restaurant');
      }
      return;
    }

    // RESTAURANT_ADMIN, WAITER, CHEF — must be assigned to this restaurant
    if (actor.restaurantId !== restaurantId) {
      throw new ForbiddenException('You are not assigned to this restaurant');
    }

    // WAITER / CHEF can only view, not manage
    if (
      mode === 'manage' &&
      (actor.role === UserRole.WAITER || actor.role === UserRole.CHEF)
    ) {
      throw new ForbiddenException(
        'WAITER and CHEF can only view categories, not create or edit them',
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
      throw new ForbiddenException('Insufficient permissions to delete categories');
    }
  }
}
