import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { StockActionDto, StockAction } from './dto/stock-action.dto';
import { User, UserRole, ItemType } from '../../generated/prisma';

// ─── Full include clause ──────────────────────────────────────────────────────

const ITEM_INCLUDE = {
  category: { select: { id: true, name: true } },
  restaurant: { select: { id: true, name: true, currency: true } },
} as const;

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) { }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(actor: User, restaurantId: string, dto: CreateMenuItemDto) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    // Verify category belongs to the same restaurant
    const category = await this.prisma.menuCategory.findFirst({
      where: { id: dto.categoryId, restaurantId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category ${dto.categoryId} not found in restaurant ${restaurantId}`,
      );
    }

    // STOCKABLE item must have a stockCount
    if (dto.itemType === 'STOCKABLE' && (dto.stockCount === undefined || dto.stockCount === null)) {
      throw new BadRequestException(
        'stockCount is required for STOCKABLE items',
      );
    }

    const isOutOfStock =
      dto.itemType === 'STOCKABLE' ? (dto.stockCount ?? 0) <= 0 : false;

    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        discountedPrice: dto.discountedPrice ?? null,
        imageUrl: dto.imageUrl ?? null,
        itemType: dto.itemType as ItemType,
        stockCount: dto.itemType === 'STOCKABLE' ? (dto.stockCount ?? 0) : null,
        isOutOfStock,
        sortOrder: dto.sortOrder ?? 0,
        createdById: actor.id,
      },
      include: ITEM_INCLUDE,
    });
  }

  // ─── List (for a restaurant) ──────────────────────────────────────────────

  async findAll(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'view');

    return this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: ITEM_INCLUDE,
      orderBy: [{ category: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ─── List by category ─────────────────────────────────────────────────────

  async findByCategory(actor: User, restaurantId: string, categoryId: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'view');

    const category = await this.prisma.menuCategory.findFirst({
      where: { id: categoryId, restaurantId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category ${categoryId} not found in restaurant ${restaurantId}`,
      );
    }

    return this.prisma.menuItem.findMany({
      where: { restaurantId, categoryId, isActive: true },
      include: ITEM_INCLUDE,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // ─── Get One ──────────────────────────────────────────────────────────────

  async findOne(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'view');

    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
      include: ITEM_INCLUDE,
    });

    if (!item) {
      throw new NotFoundException(
        `Menu item ${id} not found in restaurant ${restaurantId}`,
      );
    }

    return item;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    actor: User,
    restaurantId: string,
    id: string,
    dto: UpdateMenuItemDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException(
        `Menu item ${id} not found in restaurant ${restaurantId}`,
      );
    }

    // If moving to a different category, verify it belongs to same restaurant
    if (dto.categoryId && dto.categoryId !== item.categoryId) {
      const cat = await this.prisma.menuCategory.findFirst({
        where: { id: dto.categoryId, restaurantId },
      });
      if (!cat) {
        throw new NotFoundException(
          `Category ${dto.categoryId} not found in restaurant ${restaurantId}`,
        );
      }
    }

    // Delete old S3 image if a new one is supplied
    if (dto.imageUrl && item.imageUrl && dto.imageUrl !== item.imageUrl) {
      await this.s3.deleteFile(item.imageUrl);
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.discountedPrice !== undefined && {
          discountedPrice: dto.discountedPrice,
        }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: ITEM_INCLUDE,
    });
  }

  // ─── Stock Management ─────────────────────────────────────────────────────

  async manageStock(
    actor: User,
    restaurantId: string,
    id: string,
    dto: StockActionDto,
  ) {
    // Only RESTAURANT_ADMIN and CHEF can manage stock (plus OWNER and SUPER_ADMIN)
    if (
      !(
        [
          UserRole.SUPER_ADMIN,
          UserRole.OWNER,
          UserRole.RESTAURANT_ADMIN,
          UserRole.CHEF,
        ] as UserRole[]
      ).includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Only RESTAURANT_ADMIN and CHEF (and above) can manage stock',
      );
    }

    await this.assertRestaurantAccess(actor, restaurantId, 'view');

    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException(
        `Menu item ${id} not found in restaurant ${restaurantId}`,
      );
    }

    let updateData: any = {};

    switch (dto.action) {
      // ── Mark Out of Stock ────────────────────────────────────────────────
      case StockAction.MARK_OUT_OF_STOCK:
        updateData = {
          isOutOfStock: true,
          outOfStockAt: new Date(),
          ...(item.itemType === ItemType.STOCKABLE && { stockCount: 0 }),
        };
        break;

      // ── Set Stock Count (STOCKABLE only) ──────────────────────────────────
      case StockAction.SET_STOCK:
        this.requireStockable(item, dto.action);
        this.requireQuantity(dto);
        updateData = {
          stockCount: dto.quantity,
          isOutOfStock: dto.quantity! <= 0,
          ...(dto.quantity! > 0 && { outOfStockAt: null }),
        };
        break;

      // ── Decrease Stock Count (STOCKABLE only) ─────────────────────────────
      case StockAction.DECREASE_STOCK:
        this.requireStockable(item, dto.action);
        this.requireQuantity(dto);
        {
          const current = item.stockCount ?? 0;
          const newCount = Math.max(0, current - dto.quantity!);
          updateData = {
            stockCount: newCount,
            isOutOfStock: newCount <= 0,
            ...(newCount <= 0 && { outOfStockAt: new Date() }),
          };
        }
        break;

      // ── Restock ──────────────────────────────────────────────────────────
      case StockAction.RESTOCK:
        if (item.itemType === ItemType.STOCKABLE) {
          this.requireQuantity(dto);
          updateData = {
            stockCount: dto.quantity,
            isOutOfStock: dto.quantity! <= 0,
            ...(dto.quantity! > 0 && { outOfStockAt: null }),
          };
        } else {
          // NON_STOCKABLE — just flip the flag
          updateData = { isOutOfStock: false, outOfStockAt: null };
        }
        break;
    }

    const updated = await this.prisma.menuItem.update({
      where: { id },
      data: updateData,
      include: ITEM_INCLUDE,
    });

    this.logger.log(
      `[Stock] ${actor.email} → ${dto.action} on "${item.name}" (${item.itemType}) ` +
      `in restaurant ${restaurantId}`,
    );

    return updated;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId },
    });
    if (!item) {
      throw new NotFoundException(
        `Menu item ${id} not found in restaurant ${restaurantId}`,
      );
    }

    if (item.imageUrl) await this.s3.deleteFile(item.imageUrl);

    await this.prisma.menuItem.delete({ where: { id } });
    return { message: `Menu item "${item.name}" deleted successfully` };
  }

  // ─── Cron: Auto-restock NON_STOCKABLE items every midnight ───────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoRestockNonStockable(): Promise<void> {
    const result = await this.prisma.menuItem.updateMany({
      where: {
        itemType: ItemType.NON_STOCKABLE,
        isOutOfStock: true,
      },
      data: {
        isOutOfStock: false,
        outOfStockAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `[Cron] Auto-restocked ${result.count} NON_STOCKABLE menu item(s) at midnight`,
      );
    }
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

    if (actor.restaurantId !== restaurantId) {
      throw new ForbiddenException('You are not assigned to this restaurant');
    }

    if (
      mode === 'manage' &&
      actor.role === UserRole.WAITER
    ) {
      throw new ForbiddenException('WAITER cannot create or edit menu items');
    }
  }

  private requireStockable(item: any, action: StockAction): void {
    if (item.itemType !== ItemType.STOCKABLE) {
      throw new BadRequestException(
        `Action "${action}" is only valid for STOCKABLE items. ` +
        `Item "${item.name}" is NON_STOCKABLE.`,
      );
    }
  }

  private requireQuantity(dto: StockActionDto): void {
    if (dto.quantity === undefined || dto.quantity === null) {
      throw new BadRequestException(
        `"quantity" is required for action "${dto.action}"`,
      );
    }
  }
}
