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
