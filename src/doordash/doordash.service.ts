import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  User,
  UserRole,
  DoorDashEventType,
  DoorDashWebhookStatus,
} from '@prisma/client';
import { UpsertDoorDashSettingsDto } from './dto/upsert-settings.dto';
import { CreateItemMappingDto } from './dto/create-item-mapping.dto';

// ─── DoorDash webhook payload shape ──────────────────────────────────────────
// Loosely typed — DoorDash may evolve the schema.
interface DoorDashWebhookPayload {
  id?: string;               // DoorDash event UUID
  event_type?: string;       // "ORDER_CREATED" | "ORDER_CANCELLED" | etc.
  created_at?: string;
  order?: DoorDashOrder;
}

interface DoorDashOrder {
  id: string;                // DoorDash order UUID
  external_id?: string;      // Optional merchant-side reference
  store_id?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    email?: string;
  };
  delivery_address?: {
    formatted_address?: string;
  };
  items?: DoorDashOrderItem[];
  subtotal?: number;         // Total in cents
  tax_amount?: number;       // Tax in cents
  total?: number;            // Grand total in cents
  special_instructions?: string;
  estimated_pickup_time?: string;
}

interface DoorDashOrderItem {
  id?: string;               // DoorDash item UUID
  name?: string;             // Item display name
  quantity?: number;
  unit_price?: number;       // Price per unit in cents
  options?: DoorDashItemOption[];
}

interface DoorDashItemOption {
  id?: string;
  name?: string;
  quantity?: number;
  unit_price?: number;
}

@Injectable()
export class DoorDashService {
  private readonly logger = new Logger(DoorDashService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  Settings
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettings(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const settings = await this.prisma.doorDashSettings.findUnique({
      where: { restaurantId },
      include: {
        itemMappings: {
          include: {
            menuItem: { select: { id: true, name: true, imageUrl: true, price: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!settings) {
      return {
        configured: false,
        webhookUrl: this.buildWebhookUrlHint(restaurantId),
        settings: null,
      };
    }

    // Mask secrets in response
    return {
      configured: true,
      webhookUrl: this.buildWebhookUrlHint(restaurantId),
      settings: {
        ...settings,
        signingSecret: '••••••••',
        webhookSecret: '••••••••',
      },
    };
  }

  async upsertSettings(
    actor: User,
    restaurantId: string,
    dto: UpsertDoorDashSettingsDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const data = {
      restaurantId,
      developerId: dto.developerId,
      keyId: dto.keyId,
      signingSecret: dto.signingSecret,
      webhookSecret: dto.webhookSecret,
      storeId: dto.storeId ?? null,
      autoAccept: dto.autoAccept ?? true,
      autoCreateOrders: dto.autoCreateOrders ?? true,
      isActive: true,
    };

    await this.prisma.doorDashSettings.upsert({
      where: { restaurantId },
      create: data,
      update: data,
    });

    return this.getSettings(actor, restaurantId);
  }

  async deleteSettings(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const settings = await this.prisma.doorDashSettings.findUnique({
      where: { restaurantId },
    });
    if (!settings) throw new NotFoundException('DoorDash settings not found for this restaurant');

    await this.prisma.doorDashSettings.delete({ where: { restaurantId } });
    return { message: 'DoorDash integration removed successfully' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Item Mappings
  // ═══════════════════════════════════════════════════════════════════════════

  async listItemMappings(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const settings = await this.requireSettings(restaurantId);

    return this.prisma.doorDashItemMapping.findMany({
      where: { doorDashSettingsId: settings.id },
      include: {
        menuItem: { select: { id: true, name: true, price: true, imageUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createItemMapping(
    actor: User,
    restaurantId: string,
    dto: CreateItemMappingDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId);

    if (!dto.doorDashItemId && !dto.doorDashItemName) {
      throw new BadRequestException(
        'At least one of doorDashItemId or doorDashItemName must be provided',
      );
    }

    const settings = await this.requireSettings(restaurantId);

    // Verify menu item belongs to this restaurant
    const menuItem = await this.prisma.menuItem.findFirst({
      where: { id: dto.menuItemId, restaurantId },
    });
    if (!menuItem) {
      throw new NotFoundException(
        `Menu item ${dto.menuItemId} not found in restaurant ${restaurantId}`,
      );
    }

    // Avoid duplicate mapping for the same DoorDash item ID
    if (dto.doorDashItemId) {
      const existing = await this.prisma.doorDashItemMapping.findFirst({
        where: {
          doorDashSettingsId: settings.id,
          doorDashItemId: dto.doorDashItemId,
        },
      });
      if (existing) {
        throw new BadRequestException(
          `A mapping for DoorDash item ID "${dto.doorDashItemId}" already exists`,
        );
      }
    }

    return this.prisma.doorDashItemMapping.create({
      data: {
        doorDashSettingsId: settings.id,
        menuItemId: dto.menuItemId,
        doorDashItemId: dto.doorDashItemId ?? null,
        doorDashItemName: dto.doorDashItemName ?? null,
      },
      include: {
        menuItem: { select: { id: true, name: true, price: true } },
      },
    });
  }

  async deleteItemMapping(actor: User, restaurantId: string, mappingId: string) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const settings = await this.requireSettings(restaurantId);

    const mapping = await this.prisma.doorDashItemMapping.findFirst({
      where: { id: mappingId, doorDashSettingsId: settings.id },
    });
    if (!mapping) throw new NotFoundException(`Item mapping ${mappingId} not found`);

    await this.prisma.doorDashItemMapping.delete({ where: { id: mappingId } });
    return { message: 'Item mapping deleted' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Webhook
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Entry point for incoming DoorDash webhooks.
   *
   * Called from the webhook controller with the raw body bytes so HMAC
   * verification is accurate.
   *
   * @param restaurantId  - resolved from the URL slug or query param
   * @param rawBody       - raw Buffer (from req.rawBody)
   * @param signature     - value of the X-DoorDash-Signature header
   */
  async handleWebhook(
    restaurantId: string,
    rawBody: Buffer,
    signature: string | undefined,
  ): Promise<{ received: boolean; event: string; sessionId: string | null }> {
    // 1. Load settings — if not configured, still log and return 200 (avoid DoorDash retries)
    const settings = await this.prisma.doorDashSettings.findUnique({
      where: { restaurantId },
    });

    let payload: DoorDashWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.error(`DoorDash: failed to parse JSON body for restaurant ${restaurantId}`);
      await this.logWebhook(restaurantId, null, DoorDashEventType.UNKNOWN, rawBody, null, DoorDashWebhookStatus.FAILED, null, 'Invalid JSON');
      return { received: true, event: 'INVALID_JSON', sessionId: null };
    }

    const eventType = this.mapEventType(payload.event_type);

    if (!settings || !settings.isActive) {
      await this.logWebhook(restaurantId, payload.id, eventType, rawBody, payload, DoorDashWebhookStatus.IGNORED, null, 'DoorDash not configured or inactive');
      return { received: true, event: payload.event_type ?? 'UNKNOWN', sessionId: null };
    }

    // 2. Verify signature
    if (!this.verifySignature(rawBody, signature, settings.webhookSecret)) {
      await this.logWebhook(restaurantId, payload.id, eventType, rawBody, payload, DoorDashWebhookStatus.FAILED, null, 'Invalid signature');
      this.logger.warn(`DoorDash: signature mismatch for restaurant ${restaurantId}`);
      // Return 200 anyway to prevent DoorDash flooding retries — but mark as FAILED internally
      return { received: true, event: payload.event_type ?? 'UNKNOWN', sessionId: null };
    }

    // 3. Route by event type
    let sessionId: string | null = null;
    let status: DoorDashWebhookStatus = DoorDashWebhookStatus.PROCESSED;
    let errorMsg: string | null = null;

    try {
      if (eventType === DoorDashEventType.ORDER_CREATED && settings.autoCreateOrders) {
        sessionId = await this.processOrderCreated(restaurantId, payload, settings);
      } else {
        // Other event types (cancelled, picked up, delivered) — just log for now
        status = DoorDashWebhookStatus.IGNORED;
      }
    } catch (err) {
      status = DoorDashWebhookStatus.FAILED;
      errorMsg = err.message;
      this.logger.error(`DoorDash order processing error: ${err.message}`, err.stack);
    }

    await this.logWebhook(restaurantId, payload.id, eventType, rawBody, payload, status, sessionId, errorMsg);

    return { received: true, event: payload.event_type ?? 'UNKNOWN', sessionId };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Webhook log viewer (for staff)
  // ═══════════════════════════════════════════════════════════════════════════

  async getWebhookLogs(
    actor: User,
    restaurantId: string,
    page = 1,
    limit = 20,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId);

    const where = { restaurantId };
    const [logs, total] = await Promise.all([
      this.prisma.doorDashWebhookLog.findMany({
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
          // rawPayload excluded from the list view — fetch individual log for full payload
        },
      }),
      this.prisma.doorDashWebhookLog.count({ where }),
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

    const log = await this.prisma.doorDashWebhookLog.findFirst({
      where: { id: logId, restaurantId },
    });
    if (!log) throw new NotFoundException(`Webhook log ${logId} not found`);

    return log;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Order processing
  // ═══════════════════════════════════════════════════════════════════════════

  private async processOrderCreated(
    restaurantId: string,
    payload: DoorDashWebhookPayload,
    settings: any,
  ): Promise<string> {
    const order = payload.order;
    if (!order) throw new BadRequestException('Webhook payload missing order object');

    // Resolve restaurant owner — used as the system opener for DoorDash orders
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { owner: true },
    });
    if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

    // Load item mappings for this restaurant
    const mappings = await this.prisma.doorDashItemMapping.findMany({
      where: { doorDashSettingsId: settings.id },
      include: { menuItem: true },
    });

    // Resolve items → local menu items
    const resolvedItems: {
      menuItemId: string;
      menuItemName: string;
      quantity: number;
      unitPrice: number; // in restaurant currency (converted from cents)
    }[] = [];

    for (const ddItem of order.items ?? []) {
      const menuItem = await this.resolveMenuItem(restaurantId, ddItem, mappings);

      if (!menuItem) {
        this.logger.warn(
          `DoorDash: could not resolve item "${ddItem.name}" (id: ${ddItem.id}) in restaurant ${restaurantId}. ` +
          `Add an item mapping via PUT /restaurants/${restaurantId}/doordash/item-mappings.`,
        );
        continue; // Skip unresolved items rather than failing the whole order
      }

      resolvedItems.push({
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: ddItem.quantity ?? 1,
        unitPrice: ddItem.unit_price != null ? ddItem.unit_price / 100 : Number(menuItem.price),
      });
    }

    if (resolvedItems.length === 0) {
      throw new BadRequestException(
        'No items could be resolved from the DoorDash order. ' +
        'Please add item mappings for all DoorDash menu items.',
      );
    }

    const customerName =
      [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || null;
    const customerPhone = order.customer?.phone_number ?? null;
    const customerEmail = order.customer?.email ?? null;
    const deliveryAddress = order.delivery_address?.formatted_address ?? null;

    // Build short session ID
    const sessionNumber = await this.generateUniqueSessionNumber(restaurantId);

    // Create session
    const session = await this.prisma.orderSession.create({
      data: {
        restaurantId,
        sessionNumber,
        channel: 'DOORDASH' as any,
        status: 'OPEN' as any,
        externalOrderId: order.id,
        externalChannel: 'DoorDash',
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        specialInstructions: order.special_instructions ?? null,
        guestCount: 1,
        openedById: restaurant.ownerId,
      },
    });

    // Generate batch number
    const batchNumber = await this.generateUniqueBatchNumber(session.id);

    // Create batch with all items
    await this.prisma.orderBatch.create({
      data: {
        sessionId: session.id,
        batchNumber,
        status: 'PENDING' as any,
        notes: `DoorDash order #${order.id}`,
        items: {
          create: resolvedItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            status: 'PENDING' as any,
          })),
        },
      },
    });

    this.logger.log(
      `DoorDash: created session ${sessionNumber} for DoorDash order ${order.id} in restaurant ${restaurantId}`,
    );

    return session.id;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Internal helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verifies the DoorDash HMAC-SHA256 signature.
   *
   * DoorDash sends: X-DoorDash-Signature: t=<timestamp>,v1=<hex-signature>
   * The signed payload is: `<timestamp>.<raw_body>`
   */
  private verifySignature(
    rawBody: Buffer,
    signatureHeader: string | undefined,
    secret: string,
  ): boolean {
    if (!signatureHeader) return false;

    try {
      // Parse "t=<ts>,v1=<sig>" format
      const parts: Record<string, string> = {};
      for (const part of signatureHeader.split(',')) {
        const [k, ...v] = part.split('=');
        parts[k.trim()] = v.join('=');
      }

      const timestamp = parts['t'];
      const receivedSig = parts['v1'];

      if (!timestamp || !receivedSig) {
        // Fallback: treat the whole header as a plain hex signature of raw body only
        const expected = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(receivedSig ?? signatureHeader, 'hex'),
          Buffer.from(expected, 'hex'),
        );
      }

      // Standard format: sign "<timestamp>.<rawBody>"
      const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(receivedSig, 'hex'),
        Buffer.from(expected, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Resolve a DoorDash order item to a local POS MenuItem.
   * Priority:
   *   1. Exact match on doorDashItemId in the item mappings
   *   2. Case-insensitive name match in the item mappings
   *   3. Case-insensitive name match directly in the restaurant's menu
   */
  private async resolveMenuItem(
    restaurantId: string,
    ddItem: DoorDashOrderItem,
    mappings: any[],
  ) {
    // 1. ID match
    if (ddItem.id) {
      const byId = mappings.find((m) => m.doorDashItemId === ddItem.id);
      if (byId) return byId.menuItem;
    }

    // 2. Name match in mappings
    if (ddItem.name) {
      const lowerName = ddItem.name.toLowerCase();
      const byName = mappings.find(
        (m) => m.doorDashItemName?.toLowerCase() === lowerName,
      );
      if (byName) return byName.menuItem;
    }

    // 3. Direct name match on menu items
    if (ddItem.name) {
      const directMatch = await this.prisma.menuItem.findFirst({
        where: {
          restaurantId,
          name: { equals: ddItem.name },
          isActive: true,
        },
      });
      if (directMatch) return directMatch;
    }

    return null;
  }

  private mapEventType(raw?: string): DoorDashEventType {
    const map: Record<string, DoorDashEventType> = {
      ORDER_CREATED: DoorDashEventType.ORDER_CREATED,
      ORDER_UPDATED: DoorDashEventType.ORDER_UPDATED,
      ORDER_CANCELLED: DoorDashEventType.ORDER_CANCELLED,
      ORDER_PICKED_UP: DoorDashEventType.ORDER_PICKED_UP,
      ORDER_DELIVERED: DoorDashEventType.ORDER_DELIVERED,
    };
    return map[raw ?? ''] ?? DoorDashEventType.UNKNOWN;
  }

  private async logWebhook(
    restaurantId: string,
    eventId: string | null | undefined,
    eventType: DoorDashEventType,
    rawBody: Buffer,
    parsed: DoorDashWebhookPayload | null,
    status: DoorDashWebhookStatus,
    sessionId: string | null,
    errorMessage: string | null,
  ) {
    try {
      await this.prisma.doorDashWebhookLog.create({
        data: {
          restaurantId,
          eventId: eventId ?? null,
          eventType,
          status,
          rawPayload: parsed ?? ({ raw: rawBody.toString('utf8') } as any),
          sessionId,
          errorMessage,
        },
      });
    } catch (logErr) {
      this.logger.error(`DoorDash: failed to write webhook log: ${logErr.message}`);
    }
  }

  private async generateUniqueSessionNumber(restaurantId: string): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id: string;
    let exists: boolean;
    do {
      id = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');
      const existing = await this.prisma.orderSession.findUnique({
        where: { restaurantId_sessionNumber: { restaurantId, sessionNumber: id } },
      });
      exists = !!existing;
    } while (exists);
    return id;
  }

  private async generateUniqueBatchNumber(sessionId: string): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id: string;
    let exists: boolean;
    do {
      id = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');
      const existing = await this.prisma.orderBatch.findUnique({
        where: { sessionId_batchNumber: { sessionId, batchNumber: id } },
      });
      exists = !!existing;
    } while (exists);
    return id;
  }

  /** Returns the public webhook URL hint (uses the restaurant UUID slug) */
  private buildWebhookUrlHint(restaurantId: string): string {
    return `/api/v1/doordash/webhook/${restaurantId}`;
  }

  private async requireSettings(restaurantId: string) {
    const settings = await this.prisma.doorDashSettings.findUnique({
      where: { restaurantId },
    });
    if (!settings) {
      throw new NotFoundException(
        'DoorDash integration is not configured for this restaurant. ' +
        'Set it up via PUT /restaurants/:id/doordash/settings.',
      );
    }
    return settings;
  }

  private async assertRestaurantAccess(actor: User, restaurantId: string) {
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

    if (actor.role !== UserRole.RESTAURANT_ADMIN) {
      throw new ForbiddenException('Only OWNER, RESTAURANT_ADMIN or SUPER_ADMIN can manage DoorDash settings');
    }
  }
}
