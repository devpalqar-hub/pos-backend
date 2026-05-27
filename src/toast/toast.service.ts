import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ToastSyncStatus,
  ToastSyncType,
  User,
  UserRole,
} from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertToastSettingsDto } from './dto/upsert-toast-settings.dto';
import { SyncToastMenuDto } from './dto/sync-toast-menu.dto';
import { SyncToastOrdersDto } from './dto/sync-toast-orders.dto';

interface ToastTokenResponse {
  token?: {
    accessToken?: string;
    expiresIn?: number;
  };
  status?: string;
}

interface ToastMenuItemCandidate {
  toastItemGuid: string;
  name: string;
  price: number;
  categoryName: string;
}

@Injectable()
export class ToastService {
  private readonly logger = new Logger(ToastService.name);

  // Simple process-level token cache to avoid requesting token for every call.
  private readonly tokenCache = new Map<
    string,
    { accessToken: string; expiresAt: number }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const settings = await this.prisma.toastSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings) {
      return {
        configured: false,
        settings: null,
      };
    }

    return {
      configured: true,
      settings: {
        ...settings,
        clientSecret: '••••••••',
        webhookSecret: settings.webhookSecret ? '••••••••' : null,
      },
    };
  }

  async upsertSettings(
    actor: User,
    restaurantId: string,
    dto: UpsertToastSettingsDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const data = {
      restaurantId,
      clientId: dto.clientId,
      clientSecret: dto.clientSecret,
      toastRestaurantExternalId: dto.toastRestaurantExternalId,
      apiBaseUrl: (dto.apiBaseUrl ?? 'https://ws-api.toasttab.com').replace(
        /\/$/,
        '',
      ),
      defaultOrderLookbackHours: dto.defaultOrderLookbackHours ?? 24,
      autoSyncEnabled: dto.autoSyncEnabled ?? false,
      autoCreateOrders: dto.autoCreateOrders ?? true,
      ...(dto.webhookSecret !== undefined ? { webhookSecret: dto.webhookSecret } : {}),
      isActive: dto.isActive ?? true,
    };

    await this.prisma.toastSettings.upsert({
      where: { restaurantId },
      create: data,
      update: data,
    });

    await this.prisma.toastSyncState.upsert({
      where: { restaurantId },
      create: { restaurantId },
      update: {},
    });

    return this.getSettings(actor, restaurantId);
  }

  async deleteSettings(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const settings = await this.prisma.toastSettings.findUnique({
      where: { restaurantId },
    });
    if (!settings) {
      throw new NotFoundException('Toast settings not found for this restaurant');
    }

    await this.prisma.toastSettings.delete({ where: { restaurantId } });
    this.tokenCache.delete(restaurantId);

    return { message: 'Toast integration removed successfully' };
  }

  async syncMenu(actor: User, restaurantId: string, dto: SyncToastMenuDto) {
    await this.assertRestaurantAccess(actor, restaurantId);
    const settings = await this.requireSettings(restaurantId);

    const log = await this.prisma.toastSyncLog.create({
      data: {
        restaurantId,
        syncType: ToastSyncType.MENU,
        status: ToastSyncStatus.SUCCESS,
      },
    });

    try {
      const accessToken = await this.getAccessToken(settings);

      const metadata = await this.toastGet<any>(
        settings,
        '/menus/v3/metadata',
        accessToken,
      );

      const state = await this.prisma.toastSyncState.upsert({
        where: { restaurantId },
        create: { restaurantId },
        update: {},
      });

      const remoteLastUpdated = metadata?.lastUpdated
        ? new Date(metadata.lastUpdated)
        : null;

      if (
        !dto?.force &&
        remoteLastUpdated &&
        state.menuLastUpdatedAt &&
        remoteLastUpdated.getTime() <= state.menuLastUpdatedAt.getTime()
      ) {
        await this.prisma.toastSyncLog.update({
          where: { id: log.id },
          data: {
            status: ToastSyncStatus.SKIPPED,
            finishedAt: new Date(),
            summary: {
              reason: 'Menu metadata unchanged',
              remoteLastUpdated: remoteLastUpdated.toISOString(),
            },
          },
        });

        return {
          skipped: true,
          reason: 'Menu metadata unchanged',
          lastUpdated: remoteLastUpdated.toISOString(),
        };
      }

      const menuPayload = await this.toastGet<any>(
        settings,
        '/menus/v3/menus',
        accessToken,
      );

      const extracted = this.extractMenuCandidates(menuPayload);

      if (!extracted.length) {
        await this.prisma.toastSyncLog.update({
          where: { id: log.id },
          data: {
            status: ToastSyncStatus.FAILED,
            finishedAt: new Date(),
            errorMessage:
              'No menu items could be parsed from Toast payload. Validate API response shape/scopes.',
          },
        });

        throw new BadRequestException(
          'No menu items parsed from Toast menus response. Check Toast scopes and payload format.',
        );
      }

      const counters = {
        categoriesUpserted: 0,
        itemsUpserted: 0,
      };

      for (const candidate of extracted) {
        const category = await this.prisma.menuCategory.upsert({
          where: {
            restaurantId_name: {
              restaurantId,
              name: candidate.categoryName,
            },
          },
          create: {
            restaurantId,
            name: candidate.categoryName,
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });

        counters.categoriesUpserted += 1;

        const existingByToastGuid = await this.prisma.toastMenuItemMapping.findUnique({
          where: {
            restaurantId_toastItemGuid: {
              restaurantId,
              toastItemGuid: candidate.toastItemGuid,
            },
          },
          include: { menuItem: true },
        });

        let menuItemId: string;

        if (existingByToastGuid?.menuItem) {
          const updated = await this.prisma.menuItem.update({
            where: { id: existingByToastGuid.menuItem.id },
            data: {
              categoryId: category.id,
              name: candidate.name,
              price: new Prisma.Decimal(candidate.price),
              isActive: true,
              isAvailable: true,
            },
          });
          menuItemId = updated.id;
        } else {
          const byName = await this.prisma.menuItem.findFirst({
            where: {
              restaurantId,
              name: candidate.name,
            },
          });

          const menuItem = byName
            ? await this.prisma.menuItem.update({
                where: { id: byName.id },
                data: {
                  categoryId: category.id,
                  price: new Prisma.Decimal(candidate.price),
                  isActive: true,
                  isAvailable: true,
                },
              })
            : await this.prisma.menuItem.create({
                data: {
                  restaurantId,
                  categoryId: category.id,
                  name: candidate.name,
                  price: new Prisma.Decimal(candidate.price),
                  itemType: 'NON_STOCKABLE',
                  isActive: true,
                  isAvailable: true,
                  sortOrder: 0,
                },
              });

          menuItemId = menuItem.id;
        }

        counters.itemsUpserted += 1;

        await this.prisma.toastMenuItemMapping.upsert({
          where: {
            restaurantId_toastItemGuid: {
              restaurantId,
              toastItemGuid: candidate.toastItemGuid,
            },
          },
          create: {
            restaurantId,
            menuItemId,
            toastItemGuid: candidate.toastItemGuid,
            toastItemName: candidate.name,
          },
          update: {
            menuItemId,
            toastItemName: candidate.name,
          },
        });
      }

      await this.prisma.toastSyncState.update({
        where: { restaurantId },
        data: {
          menuLastUpdatedAt: remoteLastUpdated ?? new Date(),
          lastSyncStatus: ToastSyncStatus.SUCCESS,
          lastSyncError: null,
          lastSuccessfulAt: new Date(),
        },
      });

      await this.prisma.toastSyncLog.update({
        where: { id: log.id },
        data: {
          status: ToastSyncStatus.SUCCESS,
          finishedAt: new Date(),
          categoriesUpserted: counters.categoriesUpserted,
          itemsUpserted: counters.itemsUpserted,
          summary: {
            extractedItems: extracted.length,
            remoteLastUpdated: remoteLastUpdated?.toISOString() ?? null,
          },
        },
      });

      return {
        skipped: false,
        extractedItems: extracted.length,
        ...counters,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error during Toast menu sync';

      await this.prisma.toastSyncState.upsert({
        where: { restaurantId },
        create: {
          restaurantId,
          lastSyncStatus: ToastSyncStatus.FAILED,
          lastSyncError: errorMessage,
        },
        update: {
          lastSyncStatus: ToastSyncStatus.FAILED,
          lastSyncError: errorMessage,
        },
      });

      await this.prisma.toastSyncLog.update({
        where: { id: log.id },
        data: {
          status: ToastSyncStatus.FAILED,
          finishedAt: new Date(),
          errorMessage,
        },
      });

      throw err;
    }
  }

  async syncOrders(
    actor: User,
    restaurantId: string,
    dto: SyncToastOrdersDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId);
    const settings = await this.requireSettings(restaurantId);

    const log = await this.prisma.toastSyncLog.create({
      data: {
        restaurantId,
        syncType: ToastSyncType.ORDERS,
        status: ToastSyncStatus.SUCCESS,
      },
    });

    try {
      const state = await this.prisma.toastSyncState.upsert({
        where: { restaurantId },
        create: { restaurantId },
        update: {},
      });

      const now = new Date();
      const defaultLookbackMs = settings.defaultOrderLookbackHours * 60 * 60 * 1000;

      const endDate = dto.endDate ? new Date(dto.endDate) : now;

      const startDate = dto.startDate
        ? new Date(dto.startDate)
        : !dto.force && state.ordersLastEndAt
          ? state.ordersLastEndAt
          : new Date(endDate.getTime() - defaultLookbackMs);

      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid startDate/endDate format');
      }
      if (startDate >= endDate) {
        throw new BadRequestException('startDate must be earlier than endDate');
      }

      const accessToken = await this.getAccessToken(settings);
      const pageSize = dto.pageSize ?? 100;

      let page = 1;
      let fetched = 0;
      let created = 0;
      let skipped = 0;

      while (true) {
        const orders = await this.toastGet<any[]>(
          settings,
          '/orders/v2/ordersBulk',
          accessToken,
          {
            startDate: this.toToastDate(startDate),
            endDate: this.toToastDate(endDate),
            page: String(page),
            pageSize: String(pageSize),
          },
        );

        if (!Array.isArray(orders) || !orders.length) {
          break;
        }

        fetched += orders.length;

        for (const order of orders) {
          const syncResult = await this.importSingleOrder(restaurantId, order);
          if (syncResult === 'created') created += 1;
          if (syncResult === 'skipped') skipped += 1;
        }

        if (orders.length < pageSize) {
          break;
        }

        page += 1;
      }

      await this.prisma.toastSyncState.update({
        where: { restaurantId },
        data: {
          ordersLastStartAt: startDate,
          ordersLastEndAt: endDate,
          lastSyncStatus: ToastSyncStatus.SUCCESS,
          lastSyncError: null,
          lastSuccessfulAt: new Date(),
        },
      });

      await this.prisma.toastSyncLog.update({
        where: { id: log.id },
        data: {
          status: ToastSyncStatus.SUCCESS,
          finishedAt: new Date(),
          ordersCreated: created,
          ordersSkipped: skipped,
          summary: {
            fetched,
            pageCount: page,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        },
      });

      return {
        fetched,
        created,
        skipped,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error during Toast order sync';

      await this.prisma.toastSyncState.upsert({
        where: { restaurantId },
        create: {
          restaurantId,
          lastSyncStatus: ToastSyncStatus.FAILED,
          lastSyncError: errorMessage,
        },
        update: {
          lastSyncStatus: ToastSyncStatus.FAILED,
          lastSyncError: errorMessage,
        },
      });

      await this.prisma.toastSyncLog.update({
        where: { id: log.id },
        data: {
          status: ToastSyncStatus.FAILED,
          finishedAt: new Date(),
          errorMessage,
        },
      });

      throw err;
    }
  }

  async syncFull(actor: User, restaurantId: string, ordersDto: SyncToastOrdersDto) {
    const menu = await this.syncMenu(actor, restaurantId, { force: false });
    const orders = await this.syncOrders(actor, restaurantId, ordersDto);

    await this.prisma.toastSyncLog.create({
      data: {
        restaurantId,
        syncType: ToastSyncType.FULL,
        status: ToastSyncStatus.SUCCESS,
        startedAt: new Date(),
        finishedAt: new Date(),
        summary: { menu, orders },
      },
    });

    return { menu, orders };
  }

  async getSyncStatus(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const [settings, state, latest] = await Promise.all([
      this.prisma.toastSettings.findUnique({ where: { restaurantId } }),
      this.prisma.toastSyncState.findUnique({ where: { restaurantId } }),
      this.prisma.toastSyncLog.findFirst({
        where: { restaurantId },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    return {
      configured: !!settings,
      isActive: settings?.isActive ?? false,
      state,
      latestLog: latest,
    };
  }

  async getSyncLogs(
    actor: User,
    restaurantId: string,
    page = 1,
    limit = 20,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const where = { restaurantId };
    const [logs, total] = await Promise.all([
      this.prisma.toastSyncLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.toastSyncLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  private async importSingleOrder(
    restaurantId: string,
    order: any,
  ): Promise<'created' | 'skipped'> {
    const toastOrderGuid = order?.guid;
    if (!toastOrderGuid) return 'skipped';

    const existing = await this.prisma.toastOrderLink.findUnique({
      where: {
        restaurantId_toastOrderGuid: {
          restaurantId,
          toastOrderGuid,
        },
      },
    });

    if (existing) {
      return 'skipped';
    }

    const resolvedItems = await this.resolveToastOrderItems(restaurantId, order);
    if (!resolvedItems.length) {
      this.logger.warn(
        `Toast order ${toastOrderGuid} skipped: no resolvable items for restaurant ${restaurantId}`,
      );
      return 'skipped';
    }

    await this.prisma.$transaction(async (tx) => {
      const sessionNumber = await this.generateUniqueSessionNumber(restaurantId, tx);
      const status = this.mapOrderStatus(order);

      const customerName = this.pickFirstString([
        order?.customer?.name,
        order?.deliveryInfo?.customer?.name,
      ]);
      const customerPhone = this.pickFirstString([
        order?.customer?.phone,
        order?.deliveryInfo?.phone,
      ]);
      const customerEmail = this.pickFirstString([
        order?.customer?.email,
        order?.deliveryInfo?.email,
      ]);

      const deliveryAddress = this.pickFirstString([
        order?.deliveryInfo?.address1,
        order?.deliveryInfo?.formattedAddress,
      ]);

      const session = await tx.orderSession.create({
        data: {
          restaurantId,
          sessionNumber,
          channel: 'TOAST' as any,
          status,
          externalOrderId: toastOrderGuid,
          externalChannel: 'Toast',
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress,
          guestCount: Number(order?.numberOfGuests ?? 1),
          specialInstructions: this.pickFirstString([
            order?.deliveryInfo?.notes,
            order?.notes,
          ]),
          openedById: null,
        },
      });

      const batchNumber = await this.generateUniqueBatchNumber(session.id, tx);

      await tx.orderBatch.create({
        data: {
          sessionId: session.id,
          batchNumber,
          status: 'PENDING' as any,
          notes: `Toast order #${toastOrderGuid}`,
          items: {
            create: resolvedItems.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.unitPrice * item.quantity),
              status: 'PENDING' as any,
            })),
          },
        },
      });

      await tx.toastOrderLink.create({
        data: {
          restaurantId,
          orderSessionId: session.id,
          toastOrderGuid,
        },
      });
    });

    return 'created';
  }

  private async resolveToastOrderItems(
    restaurantId: string,
    order: any,
  ): Promise<Array<{ menuItemId: string; quantity: number; unitPrice: number }>> {
    const checks = Array.isArray(order?.checks) ? order.checks : [];
    const out: Array<{ menuItemId: string; quantity: number; unitPrice: number }> = [];

    for (const check of checks) {
      const selections = Array.isArray(check?.selections) ? check.selections : [];

      for (const selection of selections) {
        const toastItemGuid = this.pickFirstString([
          selection?.item?.guid,
          selection?.guid,
          selection?.itemGuid,
        ]);

        const name = this.pickFirstString([
          selection?.displayName,
          selection?.item?.name,
          selection?.name,
        ]);

        const quantity = Number(selection?.quantity ?? 1);
        const unitPrice = this.resolveSelectionUnitPrice(selection);

        let menuItem = null as null | { id: string };

        if (toastItemGuid) {
          const mapped = await this.prisma.toastMenuItemMapping.findUnique({
            where: {
              restaurantId_toastItemGuid: {
                restaurantId,
                toastItemGuid,
              },
            },
            include: { menuItem: { select: { id: true } } },
          });

          if (mapped?.menuItem) {
            menuItem = mapped.menuItem;
          }
        }

        if (!menuItem && name) {
          menuItem = await this.prisma.menuItem.findFirst({
            where: {
              restaurantId,
              name,
              isActive: true,
            },
            select: { id: true },
          });
        }

        if (!menuItem) {
          continue;
        }

        out.push({
          menuItemId: menuItem.id,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          unitPrice,
        });
      }
    }

    return out;
  }

  private resolveSelectionUnitPrice(selection: any): number {
    const price =
      this.asCurrency(selection?.preDiscountPrice) ??
      this.asCurrency(selection?.price) ??
      this.asCurrency(selection?.receiptLinePrice) ??
      0;

    return price > 0 ? price : 0;
  }

  private mapOrderStatus(order: any): any {
    if (order?.voided || order?.deleted) return 'CANCELLED';
    if (order?.paidDate) return 'PAID';
    if (order?.closedDate) return 'BILLED';
    return 'OPEN';
  }

  private extractMenuCandidates(payload: any): ToastMenuItemCandidate[] {
    const menus = Array.isArray(payload?.menus) ? payload.menus : [];
    const itemRefMap = payload?.itemReferences ?? {};
    const groupRefMap =
      payload?.itemGroupReferences ?? payload?.groupReferences ?? {};

    const categories = new Map<string, ToastMenuItemCandidate[]>();

    for (const menu of menus) {
      const topGroups = [
        ...this.readArrayOrEmpty(menu?.groups),
        ...this.resolveRefList(menu?.itemGroupReferences, groupRefMap),
      ];

      for (const group of topGroups) {
        this.collectGroupItems(group, groupRefMap, itemRefMap, categories, undefined);
      }
    }

    const out: ToastMenuItemCandidate[] = [];

    for (const [categoryName, items] of categories.entries()) {
      for (const item of items) {
        out.push({
          ...item,
          categoryName,
        });
      }
    }

    return out;
  }

  private collectGroupItems(
    group: any,
    groupRefMap: Record<string, any>,
    itemRefMap: Record<string, any>,
    categories: Map<string, ToastMenuItemCandidate[]>,
    parentCategory?: string,
  ) {
    if (!group || typeof group !== 'object') return;

    const categoryName =
      this.pickFirstString([group?.name, group?.displayName, parentCategory]) ??
      'Uncategorized';

    const directItems = [
      ...this.readArrayOrEmpty(group?.items),
      ...this.readArrayOrEmpty(group?.menuItems),
      ...this.resolveRefList(group?.itemReferences, itemRefMap),
    ];

    for (const item of directItems) {
      const toastItemGuid = this.pickFirstString([
        item?.guid,
        item?.itemGuid,
        item?.externalId,
      ]);

      const name = this.pickFirstString([item?.name, item?.displayName]);
      if (!toastItemGuid || !name) continue;

      const price =
        this.asCurrency(item?.price) ??
        this.asCurrency(item?.basePrice) ??
        this.asCurrency(item?.defaultPrice) ??
        this.asCurrency(item?.pricingStrategy?.basePrice) ??
        0;

      if (!categories.has(categoryName)) {
        categories.set(categoryName, []);
      }

      categories.get(categoryName)?.push({
        toastItemGuid,
        name,
        price,
        categoryName,
      });
    }

    const nestedGroups = [
      ...this.readArrayOrEmpty(group?.groups),
      ...this.readArrayOrEmpty(group?.menuGroups),
      ...this.resolveRefList(group?.itemGroupReferences, groupRefMap),
    ];

    for (const nested of nestedGroups) {
      this.collectGroupItems(
        nested,
        groupRefMap,
        itemRefMap,
        categories,
        categoryName,
      );
    }
  }

  private resolveRefList(refs: any, source: Record<string, any>): any[] {
    const out: any[] = [];

    if (Array.isArray(refs)) {
      for (const ref of refs) {
        if (typeof ref === 'string' || typeof ref === 'number') {
          const found = source[String(ref)];
          if (found) out.push(found);
        } else if (ref && typeof ref === 'object') {
          const key =
            this.pickFirstString([ref.id, ref.guid, ref.referenceId, ref.identifier]) ??
            null;
          if (key && source[String(key)]) {
            out.push(source[String(key)]);
          }
        }
      }
    }

    return out;
  }

  private readArrayOrEmpty(value: any): any[] {
    return Array.isArray(value) ? value : [];
  }

  private asCurrency(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;

    // Toast often returns integer cents for monetary values.
    if (Number.isInteger(num)) {
      return Number((num / 100).toFixed(2));
    }

    return Number(num.toFixed(2));
  }

  private pickFirstString(values: unknown[]): string | null {
    for (const v of values) {
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return null;
  }

  // ─── Push-to-Toast (fire-and-forget) ──────────────────────────────────────

  /**
   * Attempts to push a locally-created batch of items to the Toast POS dashboard
   * as a new order. This method NEVER throws — all errors are caught and logged so
   * the local order flow is never disrupted.
   *
   * Channels that are skipped (already originate from an external platform):
   *   UBER_EATS, DOORDASH, TOAST
   *
   * Only the first batch on a session triggers a new Toast order. Subsequent batches
   * on the same session are logged as a warning (future: patch existing order).
   *
   * @param restaurantId  The restaurant UUID
   * @param sessionId     The local OrderSession UUID
   * @param items         Resolved items from the batch: { menuItemId, quantity, unitPrice }
   */
  async tryPushBatchToToast(
    restaurantId: string,
    sessionId: string,
    items: Array<{ menuItemId: string; quantity: number; unitPrice: number }>,
  ): Promise<void> {
    try {
      // ── 1. Load Toast settings — silently skip if not configured / inactive ──
      const settings = await this.prisma.toastSettings.findUnique({
        where: { restaurantId },
      });

      if (!settings || !settings.isActive) {
        return; // Toast not configured for this restaurant
      }

      // ── 2. Load the session to check its channel ──────────────────────────
      const session = await this.prisma.orderSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          channel: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          deliveryAddress: true,
          specialInstructions: true,
          guestCount: true,
          toastOrderLink: { select: { id: true, toastOrderGuid: true } },
        },
      });

      if (!session) {
        this.logger.warn(`tryPushBatchToToast: session ${sessionId} not found`);
        return;
      }

      // ── 3. Skip channels that originate from external platforms ───────────
      const SKIP_CHANNELS = ['UBER_EATS', 'DOORDASH', 'TOAST'];
      if (SKIP_CHANNELS.includes(session.channel as string)) {
        this.logger.debug(
          `tryPushBatchToToast: skipping session ${sessionId} (channel=${session.channel})`,
        );
        return;
      }

      // ── 4. If there is already a Toast order link, skip (first-batch only) ─
      if (session.toastOrderLink) {
        this.logger.warn(
          `tryPushBatchToToast: session ${sessionId} already linked to Toast order ` +
            `${session.toastOrderLink.toastOrderGuid}. Subsequent batch not pushed — ` +
            'update existing Toast order is not yet implemented.',
        );
        return;
      }

      // ── 5. Resolve menu items to their Toast GUIDs ────────────────────────
      const selections: Array<{ entityType: string; item: { guid: string; entityType: string }; quantity: number }> = [];

      for (const item of items) {
        const mapping = await this.prisma.toastMenuItemMapping.findUnique({
          where: {
            restaurantId_menuItemId: {
              restaurantId,
              menuItemId: item.menuItemId,
            },
          },
          select: { toastItemGuid: true, toastItemName: true },
        });

        if (!mapping) {
          this.logger.warn(
            `tryPushBatchToToast: menuItemId ${item.menuItemId} has no Toast GUID mapping — skipping item`,
          );
          continue;
        }

        selections.push({
          entityType: 'MenuItemSelection',
          item: { guid: mapping.toastItemGuid, entityType: 'MenuItem' },
          quantity: item.quantity,
        });
      }

      if (!selections.length) {
        this.logger.warn(
          `tryPushBatchToToast: session ${sessionId} — no items had Toast GUID mappings; order not pushed`,
        );
        return;
      }

      // ── 6. Build Toast order payload ──────────────────────────────────────
      const isDelivery =
        session.channel === 'ONLINE_OWN' && !!session.deliveryAddress;

      const orderPayload: Record<string, unknown> = {
        entityType: 'Order',
        source: 'POS',
        checks: [
          {
            entityType: 'Check',
            ...(session.customerName ? { customer: {
              entityType: 'Customer',
              firstName: session.customerName.split(' ')[0] ?? session.customerName,
              lastName: session.customerName.split(' ').slice(1).join(' ') || undefined,
              phone: session.customerPhone ?? undefined,
              email: session.customerEmail ?? undefined,
            } } : {}),
            selections,
          },
        ],
        ...(session.specialInstructions ? { deliveryInfo: { notes: session.specialInstructions } } : {}),
        ...(isDelivery ? {
          deliveryInfo: {
            address1: session.deliveryAddress,
            deliveryType: 'DELIVERY',
            notes: session.specialInstructions ?? undefined,
          },
        } : {}),
      };

      // ── 7. Authenticate and POST to Toast ─────────────────────────────────
      const accessToken = await this.getAccessToken(settings);
      const created = await this.toastPost<any>(
        settings,
        '/orders/v2/orders',
        accessToken,
        orderPayload,
      );

      const toastOrderGuid: string | undefined =
        created?.guid ?? created?.order?.guid ?? created?.[0]?.guid;

      if (!toastOrderGuid) {
        this.logger.error(
          `tryPushBatchToToast: Toast response did not include a GUID for session ${sessionId}. ` +
            `Response: ${JSON.stringify(created).slice(0, 500)}`,
        );
        return;
      }

      // ── 8. Record the link so we don't push again ─────────────────────────
      await this.prisma.toastOrderLink.create({
        data: {
          restaurantId,
          orderSessionId: sessionId,
          toastOrderGuid,
        },
      });

      this.logger.log(
        `tryPushBatchToToast: session ${sessionId} pushed to Toast — Toast order GUID: ${toastOrderGuid}`,
      );
    } catch (err) {
      // Fire-and-forget: log but never propagate — local order must never fail because of Toast
      this.logger.error(
        `tryPushBatchToToast failed for session ${sessionId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  private async requireSettings(restaurantId: string) {
    const settings = await this.prisma.toastSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings || !settings.isActive) {
      throw new NotFoundException(
        'Toast integration is not configured or inactive for this restaurant',
      );
    }

    return settings;
  }

  private async getAccessToken(settings: {
    restaurantId: string;
    clientId: string;
    clientSecret: string;
    apiBaseUrl: string;
  }) {
    const cached = this.tokenCache.get(settings.restaurantId);
    const now = Date.now();
    if (cached && cached.expiresAt > now + 10_000) {
      return cached.accessToken;
    }

    const url = `${settings.apiBaseUrl}/authentication/v1/authentication/login`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        userAccessType: 'TOAST_MACHINE_CLIENT',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadRequestException(
        `Toast authentication failed (${response.status}): ${body}`,
      );
    }

    const data = (await response.json()) as ToastTokenResponse;
    const accessToken = data?.token?.accessToken;
    if (!accessToken) {
      throw new BadRequestException('Toast authentication response has no accessToken');
    }

    const expiresIn = Number(data?.token?.expiresIn ?? 1800);
    this.tokenCache.set(settings.restaurantId, {
      accessToken,
      expiresAt: now + Math.max(30, expiresIn - 20) * 1000,
    });

    return accessToken;
  }

  private async toastGet<T>(
    settings: { apiBaseUrl: string; toastRestaurantExternalId: string },
    path: string,
    accessToken: string,
    query?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${settings.apiBaseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': settings.toastRestaurantExternalId,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new BadRequestException(
        `Toast API GET ${path} failed (${response.status}): ${body}`,
      );
    }

    return (await response.json()) as T;
  }

  private async toastPost<T>(
    settings: { apiBaseUrl: string; toastRestaurantExternalId: string },
    path: string,
    accessToken: string,
    body: unknown,
  ): Promise<T> {
    const url = `${settings.apiBaseUrl}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Toast-Restaurant-External-ID': settings.toastRestaurantExternalId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new BadRequestException(
        `Toast API POST ${path} failed (${response.status}): ${text}`,
      );
    }

    return (await response.json()) as T;
  }

  private toToastDate(date: Date): string {
    // Toast examples use ISO-8601 with timezone offset; ISO string is accepted in practice.
    return date.toISOString();
  }

  private async generateUniqueSessionNumber(
    restaurantId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    let exists = false;

    do {
      id = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');

      const existing = await tx.orderSession.findUnique({
        where: {
          restaurantId_sessionNumber: {
            restaurantId,
            sessionNumber: id,
          },
        },
      });

      exists = !!existing;
    } while (exists);

    return id;
  }

  private async generateUniqueBatchNumber(
    sessionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    let exists = false;

    do {
      id = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');

      const existing = await tx.orderBatch.findUnique({
        where: {
          sessionId_batchNumber: {
            sessionId,
            batchNumber: id,
          },
        },
      });

      exists = !!existing;
    } while (exists);

    return id;
  }

  // ─── Webhook Handling ────────────────────────────────────────────────────────

  /**
   * Entry point for incoming Toast webhooks.
   *
   * Called from the public webhook controller with the raw request body so HMAC
   * verification is accurate.
   *
   * Toast sends: POST /toast/webhook/:restaurantId
   * Header:      Toast-Notification-Signature: <hmac_sha256_hex>
   *
   * Always returns 200 — all processing status is recorded in ToastWebhookLog.
   */
  async handleWebhook(
    restaurantId: string,
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: boolean; event: string; sessionId: string | null }> {
    // ── 1. Parse body ─────────────────────────────────────────────────────────
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.error(`Toast webhook: failed to parse JSON for restaurant ${restaurantId}`);
      await this.logToastWebhook(restaurantId, null, 'UNKNOWN', rawBody, null, 'FAILED', null, 'Invalid JSON');
      return { received: true, event: 'INVALID_JSON', sessionId: null };
    }

    const eventType = this.mapToastEventType(payload.eventType ?? payload.type ?? '');
    const eventId: string | null = payload.eventId ?? payload.id ?? null;

    // ── 2. Load settings ──────────────────────────────────────────────────────
    const settings = await this.prisma.toastSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings || !settings.isActive) {
      await this.logToastWebhook(restaurantId, eventId, eventType, rawBody, payload, 'IGNORED', null, 'Toast not configured or inactive');
      return { received: true, event: eventType, sessionId: null };
    }

    // ── 3. Verify HMAC signature (if webhookSecret is configured) ─────────────
    if (settings.webhookSecret) {
      if (!this.verifyToastSignature(rawBody, signature, settings.webhookSecret)) {
        this.logger.warn(`Toast webhook: invalid signature for restaurant ${restaurantId}`);
        await this.logToastWebhook(restaurantId, eventId, eventType, rawBody, payload, 'FAILED', null, 'Invalid signature');
        // Return 200 to prevent Toast retry floods — mark FAILED internally
        return { received: true, event: eventType, sessionId: null };
      }
    }

    // ── 4. Route by event type ────────────────────────────────────────────────
    let sessionId: string | null = null;
    let status: string = 'PROCESSED';
    let errorMsg: string | null = null;

    try {
      if (eventType === 'ORDER_CREATED' && settings.autoCreateOrders) {
        sessionId = await this.processToastOrderCreated(restaurantId, payload, settings);
      } else if (eventType === 'MENU_PUBLISHED') {
        // Trigger an async menu sync — fire-and-forget
        this.logger.log(`Toast webhook: MENU_PUBLISHED received for restaurant ${restaurantId} — triggering menu sync`);
        // We can't call syncMenu (it requires actor) — just log; admin can manually trigger
        status = 'IGNORED';
      } else {
        // ORDER_UPDATED, ORDER_DELETED, ORDER_VOIDED — log only
        status = 'IGNORED';
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      status = 'FAILED';
      errorMsg = error.message;
      this.logger.error(`Toast webhook: processing error for restaurant ${restaurantId}: ${error.message}`, error.stack);
    }

    await this.logToastWebhook(restaurantId, eventId, eventType, rawBody, payload, status, sessionId, errorMsg);

    return { received: true, event: eventType, sessionId };
  }

  async getWebhookLogs(actor: User, restaurantId: string, page = 1, limit = 20) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const where = { restaurantId };
    const [logs, total] = await Promise.all([
      this.prisma.toastWebhookLog.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventId: true,
          eventType: true,
          status: true,
          sessionId: true,
          errorMessage: true,
          receivedAt: true,
          // rawPayload excluded from list — fetch individual log for full payload
        },
      }),
      this.prisma.toastWebhookLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getWebhookLog(actor: User, restaurantId: string, logId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const log = await this.prisma.toastWebhookLog.findFirst({
      where: { id: logId, restaurantId },
    });
    if (!log) throw new NotFoundException(`Toast webhook log ${logId} not found`);
    return log;
  }

  // ─── Webhook helpers ─────────────────────────────────────────────────────────

  /**
   * Verifies the Toast HMAC-SHA256 signature.
   * Toast sends: Toast-Notification-Signature: <hex>
   * Signed over the raw request body using the webhookSecret.
   */
  private verifyToastSignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    secret: string,
  ): boolean {
    if (!signatureHeader) return false;
    try {
      // Toast may send "sha256=<hex>" or just "<hex>"
      const hexSig = signatureHeader.startsWith('sha256=')
        ? signatureHeader.slice(7)
        : signatureHeader;

      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (hexSig.length !== expected.length) return false;

      return crypto.timingSafeEqual(
        Buffer.from(hexSig, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Creates a local OrderSession + OrderBatch from a Toast ORDER_CREATED webhook payload.
   *
   * Toast webhook order payload shape (simplified):
   * {
   *   "eventType": "ORDER_CREATED",
   *   "order": {
   *     "guid": "...",
   *     "checks": [{ "selections": [{ "item": { "guid": "..." }, "displayName": "...", "quantity": 1, "price": 1200 }] }],
   *     "customer": { "name": "...", "phone": "...", "email": "..." },
   *     "deliveryInfo": { "address1": "...", "notes": "..." },
   *     "numberOfGuests": 2
   *   }
   * }
   */
  private async processToastOrderCreated(
    restaurantId: string,
    payload: Record<string, any>,
    settings: { autoCreateOrders: boolean },
  ): Promise<string> {
    const order = payload.order ?? payload;
    const toastOrderGuid: string | undefined = order.guid ?? order.orderGuid;

    if (!toastOrderGuid) {
      throw new BadRequestException('Toast ORDER_CREATED webhook missing order.guid');
    }

    // Dedup — if we already have this order, return its session
    const existing = await this.prisma.toastOrderLink.findUnique({
      where: { restaurantId_toastOrderGuid: { restaurantId, toastOrderGuid } },
    });
    if (existing) {
      this.logger.warn(`Toast webhook: order ${toastOrderGuid} already imported — skipping`);
      return existing.orderSessionId;
    }

    // Resolve items
    const resolvedItems = await this.resolveToastOrderItems(restaurantId, order);

    if (!resolvedItems.length) {
      throw new BadRequestException(
        `Toast webhook order ${toastOrderGuid} has no resolvable menu items. ` +
        'Run a menu sync first or add Toast menu item mappings.',
      );
    }

    const customerName = this.pickFirstString([
      order?.customer?.name,
      order?.deliveryInfo?.customer?.name,
    ]);
    const customerPhone = this.pickFirstString([
      order?.customer?.phone,
      order?.deliveryInfo?.phone,
    ]);
    const customerEmail = this.pickFirstString([
      order?.customer?.email,
      order?.deliveryInfo?.email,
    ]);
    const deliveryAddress = this.pickFirstString([
      order?.deliveryInfo?.address1,
      order?.deliveryInfo?.formattedAddress,
    ]);

    const sessionId = await this.prisma.$transaction(async (tx) => {
      const sessionNumber = await this.generateUniqueSessionNumber(restaurantId, tx);

      const session = await tx.orderSession.create({
        data: {
          restaurantId,
          sessionNumber,
          channel: 'TOAST' as any,
          status: this.mapOrderStatus(order),
          externalOrderId: toastOrderGuid,
          externalChannel: 'Toast',
          customerName,
          customerPhone,
          customerEmail,
          deliveryAddress,
          guestCount: Number(order?.numberOfGuests ?? 1),
          specialInstructions: this.pickFirstString([
            order?.deliveryInfo?.notes,
            order?.notes,
          ]),
          openedById: null,
        },
      });

      const batchNumber = await this.generateUniqueBatchNumber(session.id, tx);

      await tx.orderBatch.create({
        data: {
          sessionId: session.id,
          batchNumber,
          status: 'PENDING' as any,
          notes: `Toast webhook order #${toastOrderGuid}`,
          items: {
            create: resolvedItems.map((item) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalPrice: new Prisma.Decimal(item.unitPrice * item.quantity),
              status: 'PENDING' as any,
            })),
          },
        },
      });

      await tx.toastOrderLink.create({
        data: { restaurantId, orderSessionId: session.id, toastOrderGuid },
      });

      return session.id;
    });

    this.logger.log(
      `Toast webhook: created session ${sessionId} for Toast order ${toastOrderGuid} in restaurant ${restaurantId}`,
    );
    return sessionId;
  }

  private mapToastEventType(raw: string): string {
    const upper = (raw ?? '').toUpperCase().replace(/[^A-Z_]/g, '_');
    const known = ['ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELETED', 'ORDER_VOIDED', 'MENU_PUBLISHED'];
    return known.includes(upper) ? upper : 'UNKNOWN';
  }

  private async logToastWebhook(
    restaurantId: string | null,
    eventId: string | null,
    eventType: string,
    rawBody: Buffer,
    payload: Record<string, any> | null,
    status: string,
    sessionId: string | null,
    errorMessage: string | null,
  ): Promise<void> {
    try {
      await this.prisma.toastWebhookLog.create({
        data: {
          restaurantId: restaurantId ?? undefined,
          eventId: eventId ?? undefined,
          eventType: eventType as any,
          status: status as any,
          rawPayload: payload ?? (JSON.parse(rawBody.toString('utf8')) as any),
          sessionId: sessionId ?? undefined,
          errorMessage: errorMessage ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write ToastWebhookLog', err instanceof Error ? err.stack : String(err));
    }
  }

  private async assertRestaurantAccess(actor: User, restaurantId: string) {
    if (actor.role === UserRole.SUPER_ADMIN) return;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
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

    if (actor.role !== UserRole.RESTAURANT_ADMIN) {
      throw new ForbiddenException(
        'Only OWNER, RESTAURANT_ADMIN or SUPER_ADMIN can manage Toast integration',
      );
    }
  }
}
