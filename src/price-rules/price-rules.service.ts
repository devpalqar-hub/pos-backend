import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePriceRuleDto, PriceRuleType } from './dto/create-price-rule.dto';
import { UpdatePriceRuleDto } from './dto/update-price-rule.dto';
import { User, UserRole } from '../../generated/prisma';

// ─── Full include clause ──────────────────────────────────────────────────────

const RULE_INCLUDE = {
  days: { select: { id: true, day: true } },
  menuItem: { select: { id: true, name: true, price: true } },
  restaurant: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PriceRulesService {
  private readonly logger = new Logger(PriceRulesService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ─── Access helpers ───────────────────────────────────────────────────────

  /** Resolve which restaurants the actor can manage. */
  private async getManageableRestaurantIds(actor: User): Promise<string[]> {
    if (actor.role === UserRole.SUPER_ADMIN) return []; // empty = all

    if (actor.role === UserRole.OWNER) {
      const restaurants = await this.prisma.restaurant.findMany({
        where: { ownerId: actor.id },
        select: { id: true },
      });
      return restaurants.map((r) => r.id);
    }

    if (actor.role === UserRole.RESTAURANT_ADMIN) {
      if (actor.restaurantId) return [actor.restaurantId];
      return [];
    }

    return null as any; // WAITER / CHEF have no access — throw at call site
  }

  private async assertAccess(actor: User, restaurantId: string): Promise<void> {
    if (actor.role === UserRole.SUPER_ADMIN) return;

    if (
      actor.role !== UserRole.OWNER &&
      actor.role !== UserRole.RESTAURANT_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions for price rules');
    }

    const ids = await this.getManageableRestaurantIds(actor);
    if (!ids.includes(restaurantId)) {
      throw new ForbiddenException(
        `You do not have access to restaurant ${restaurantId}`,
      );
    }
  }

  /** Verify the restaurant exists. */
  private async assertRestaurantExists(restaurantId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${restaurantId} not found`);
    }
  }

  /** Verify the menu item exists in the given restaurant. */
  private async assertMenuItemExists(
    restaurantId: string,
    menuItemId: string,
  ): Promise<void> {
    const item = await this.prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId },
    });
    if (!item) {
      throw new NotFoundException(
        `Menu item ${menuItemId} not found in restaurant ${restaurantId}`,
      );
    }
  }

  // ─── Validation ───────────────────────────────────────────────────────────

  private validateDto(dto: CreatePriceRuleDto): void {
    if (dto.ruleType === PriceRuleType.RECURRING_WEEKLY) {
      if (!dto.days || dto.days.length === 0) {
        throw new BadRequestException(
          'days is required for RECURRING_WEEKLY price rules',
        );
      }
    }

    if (dto.ruleType === PriceRuleType.LIMITED_TIME) {
      if (!dto.startDate || !dto.endDate) {
        throw new BadRequestException(
          'startDate and endDate are required for LIMITED_TIME price rules',
        );
      }
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException('startDate must be before endDate');
      }
    }

    if (dto.startTime && dto.endTime) {
      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('startTime must be before endTime');
      }
    }
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(
    actor: User,
    restaurantId: string,
    menuItemId: string,
    dto: CreatePriceRuleDto,
  ) {
    await this.assertAccess(actor, restaurantId);
    await this.assertRestaurantExists(restaurantId);
    await this.assertMenuItemExists(restaurantId, menuItemId);
    this.validateDto(dto);

    const rule = await this.prisma.priceRule.create({
      data: {
        name: dto.name,
        ruleType: dto.ruleType as any,
        specialPrice: dto.specialPrice as any,
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
        restaurantId,
        menuItemId,
        createdById: actor.id,
        days:
          dto.ruleType === PriceRuleType.RECURRING_WEEKLY && dto.days?.length
            ? {
              create: dto.days.map((day) => ({ day: day as any })),
            }
            : undefined,
      },
      include: RULE_INCLUDE,
    });

    return rule;
  }

  // ─── List by menu item ────────────────────────────────────────────────────

  async findAllByMenuItem(
    actor: User,
    restaurantId: string,
    menuItemId: string,
  ) {
    await this.assertAccess(actor, restaurantId);
    await this.assertRestaurantExists(restaurantId);
    await this.assertMenuItemExists(restaurantId, menuItemId);

    return this.prisma.priceRule.findMany({
      where: { restaurantId, menuItemId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: RULE_INCLUDE,
    });
  }

  // ─── List all by restaurant ───────────────────────────────────────────────

  async findAllByRestaurant(actor: User, restaurantId: string) {
    await this.assertAccess(actor, restaurantId);
    await this.assertRestaurantExists(restaurantId);

    return this.prisma.priceRule.findMany({
      where: { restaurantId },
      orderBy: [{ menuItemId: 'asc' }, { priority: 'desc' }],
      include: RULE_INCLUDE,
    });
  }

  // ─── Find one ─────────────────────────────────────────────────────────────

  async findOne(
    actor: User,
    restaurantId: string,
    menuItemId: string,
    id: string,
  ) {
    await this.assertAccess(actor, restaurantId);

    const rule = await this.prisma.priceRule.findFirst({
      where: { id, restaurantId, menuItemId },
      include: RULE_INCLUDE,
    });

    if (!rule) {
      throw new NotFoundException(`Price rule ${id} not found`);
    }

    return rule;
  }

  // ─── Update ───────────────────────────────────────────────────────────────

  async update(
    actor: User,
    restaurantId: string,
    menuItemId: string,
    id: string,
    dto: UpdatePriceRuleDto,
  ) {
    await this.assertAccess(actor, restaurantId);

    // Confirm rule exists
    const existing = await this.prisma.priceRule.findFirst({
      where: { id, restaurantId, menuItemId },
    });
    if (!existing) {
      throw new NotFoundException(`Price rule ${id} not found`);
    }

    // Build merged DTO for validation (merge existing values with incoming)
    const merged: CreatePriceRuleDto = {
      name: dto.name ?? existing.name,
      ruleType: (dto.ruleType ?? existing.ruleType) as PriceRuleType,
      specialPrice: dto.specialPrice ?? (existing.specialPrice as any)?.toString(),
      startTime: dto.startTime ?? existing.startTime ?? undefined,
      endTime: dto.endTime ?? existing.endTime ?? undefined,
      startDate: dto.startDate ?? existing.startDate?.toISOString(),
      endDate: dto.endDate ?? existing.endDate?.toISOString(),
      priority: dto.priority ?? existing.priority,
      isActive: dto.isActive ?? existing.isActive,
      days: dto.days,
    };
    this.validateDto(merged);

    // If days are being updated, replace them
    const daysUpdate =
      dto.days !== undefined
        ? {
          days: {
            deleteMany: {},
            create:
              (dto.ruleType ?? existing.ruleType) === PriceRuleType.RECURRING_WEEKLY
                ? dto.days!.map((day) => ({ day: day as any }))
                : [],
          },
        }
        : {};

    const updated = await this.prisma.priceRule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.ruleType !== undefined && { ruleType: dto.ruleType as any }),
        ...(dto.specialPrice !== undefined && { specialPrice: dto.specialPrice as any }),
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
        ...(dto.startDate !== undefined && { startDate: new Date(dto.startDate!) }),
        ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate!) }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...daysUpdate,
      },
      include: RULE_INCLUDE,
    });

    return updated;
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async remove(
    actor: User,
    restaurantId: string,
    menuItemId: string,
    id: string,
  ) {
    await this.assertAccess(actor, restaurantId);

    const rule = await this.prisma.priceRule.findFirst({
      where: { id, restaurantId, menuItemId },
    });
    if (!rule) {
      throw new NotFoundException(`Price rule ${id} not found`);
    }

    await this.prisma.priceRule.delete({ where: { id } });
    return { id };
  }

  // ─── Effective price ──────────────────────────────────────────────────────

  /**
   * Returns the effective (active) price for a menu item at a given moment.
   * Rules are evaluated in order:
   *   1. isActive must be true
   *   2. LIMITED_TIME: startDate <= now <= endDate
   *   3. RECURRING_WEEKLY: day-of-week match
   *   4. Time window: startTime–endTime (if both set)
   *   5. Highest priority wins; tie-break → LIMITED_TIME beats RECURRING_WEEKLY
   */
  async getEffectivePrice(
    actor: User,
    restaurantId: string,
    menuItemId: string,
    atTime?: Date,
  ) {
    await this.assertAccess(actor, restaurantId);
    await this.assertRestaurantExists(restaurantId);
    await this.assertMenuItemExists(restaurantId, menuItemId);

    const now = atTime ?? new Date();

    const item = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { price: true },
    });
    if (!item) throw new NotFoundException(`Menu item ${menuItemId} not found`);

    const rules = await this.prisma.priceRule.findMany({
      where: { restaurantId, menuItemId, isActive: true },
      include: { days: true },
      orderBy: [{ priority: 'desc' }],
    });

    // Current day/time info
    const jsDay = now.getDay(); // 0=Sun, 1=Mon, ...
    const dayMap: Record<number, string> = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };
    const currentDayName = dayMap[jsDay];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const matchingRules = rules.filter((rule) => {
      // Date range check for LIMITED_TIME
      if (rule.ruleType === 'LIMITED_TIME') {
        if (!rule.startDate || !rule.endDate) return false;
        if (now < rule.startDate || now > rule.endDate) return false;
      }

      // Day-of-week check for RECURRING_WEEKLY
      if (rule.ruleType === 'RECURRING_WEEKLY') {
        const dayMatch = rule.days.some((d) => d.day === currentDayName);
        if (!dayMatch) return false;
      }

      // Time window check (if set)
      if (rule.startTime && rule.endTime) {
        if (currentTime < rule.startTime || currentTime > rule.endTime) {
          return false;
        }
      }

      return true;
    });

    if (matchingRules.length === 0) {
      return {
        menuItemId,
        basePrice: item.price,
        effectivePrice: item.price,
        appliedRule: null,
      };
    }

    // Sort: priority desc, then LIMITED_TIME beats RECURRING_WEEKLY
    matchingRules.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.ruleType === 'LIMITED_TIME' && b.ruleType !== 'LIMITED_TIME') return -1;
      if (b.ruleType === 'LIMITED_TIME' && a.ruleType !== 'LIMITED_TIME') return 1;
      return 0;
    });

    const winningRule = matchingRules[0];

    return {
      menuItemId,
      basePrice: item.price,
      effectivePrice: winningRule.specialPrice,
      appliedRule: {
        id: winningRule.id,
        name: winningRule.name,
        ruleType: winningRule.ruleType,
        priority: winningRule.priority,
      },
    };
  }
}
