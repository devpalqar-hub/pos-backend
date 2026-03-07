import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
    User,
    UserRole,
    UberEatsEventType,
    UberEatsWebhookStatus,
} from '@prisma/client';
import { UpsertUberEatsSettingsDto } from './dto/upsert-settings.dto';
import { CreateUberEatsItemMappingDto } from './dto/create-item-mapping.dto';

// ─── Uber Eats webhook payload shape ─────────────────────────────────────────
// Loosely typed — Uber Eats may evolve the schema.
interface UberEatsWebhookPayload {
    event_id?: string;          // Uber Eats event UUID
    event_type?: string;        // "orders.notification" etc.
    event_time?: string;
    resource_href?: string;
    meta?: {
        resource_id?: string;     // Order UUID
        status?: string;          // "CREATED" | "ACCEPTED" | "DENIED" | "CANCELLED" | etc.
        user_id?: string;
    };
    order?: UberEatsOrder;      // Present in order-related events
}

interface UberEatsOrder {
    id: string;                 // Uber Eats order UUID
    display_id?: string;        // Short display ID
    store?: {
        id?: string;
        name?: string;
    };
    eater?: {
        first_name?: string;
        last_name?: string;
        phone?: string;
        phone_code?: string;
    };
    delivery_info?: {
        location?: {
            formatted_address?: string;
        };
    };
    cart?: {
        items?: UberEatsOrderItem[];
        special_instructions?: string;
        subtotal?: number;        // Total in cents
        tax?: number;             // Tax in cents
        total?: number;           // Grand total in cents
        delivery_fee?: number;    // Delivery fee in cents
    };
    estimated_ready_for_pickup_at?: string;
}

interface UberEatsOrderItem {
    id?: string;                // Uber Eats item UUID
    title?: string;             // Item display name
    quantity?: number;
    price?: {
        unit_price?: {
            amount?: number;        // Price per unit in cents
        };
    };
    selected_modifier_groups?: UberEatsModifierGroup[];
}

interface UberEatsModifierGroup {
    id?: string;
    title?: string;
    selected_items?: {
        id?: string;
        title?: string;
        quantity?: number;
        price?: {
            unit_price?: {
                amount?: number;
            };
        };
    }[];
}

@Injectable()
export class UberEatsService {
    private readonly logger = new Logger(UberEatsService.name);

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Settings
    // ═══════════════════════════════════════════════════════════════════════════

    async getSettings(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const settings = await this.prisma.uberEatsSettings.findUnique({
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
                clientSecret: '••••••••',
                webhookSecret: '••••••••',
            },
        };
    }

    async upsertSettings(
        actor: User,
        restaurantId: string,
        dto: UpsertUberEatsSettingsDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const data = {
            restaurantId,
            clientId: dto.clientId,
            clientSecret: dto.clientSecret,
            webhookSecret: dto.webhookSecret,
            storeId: dto.storeId ?? null,
            autoAccept: dto.autoAccept ?? true,
            autoCreateOrders: dto.autoCreateOrders ?? true,
            isActive: true,
        };

        await this.prisma.uberEatsSettings.upsert({
            where: { restaurantId },
            create: data,
            update: data,
        });

        return this.getSettings(actor, restaurantId);
    }

    async deleteSettings(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const settings = await this.prisma.uberEatsSettings.findUnique({
            where: { restaurantId },
        });
        if (!settings) throw new NotFoundException('Uber Eats settings not found for this restaurant');

        await this.prisma.uberEatsSettings.delete({ where: { restaurantId } });
        return { message: 'Uber Eats integration removed successfully' };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Item Mappings
    // ═══════════════════════════════════════════════════════════════════════════

    async listItemMappings(actor: User, restaurantId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const settings = await this.requireSettings(restaurantId);

        return this.prisma.uberEatsItemMapping.findMany({
            where: { uberEatsSettingsId: settings.id },
            include: {
                menuItem: { select: { id: true, name: true, price: true, imageUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async createItemMapping(
        actor: User,
        restaurantId: string,
        dto: CreateUberEatsItemMappingDto,
    ) {
        await this.assertRestaurantAccess(actor, restaurantId);

        if (!dto.uberEatsItemId && !dto.uberEatsItemName) {
            throw new BadRequestException(
                'At least one of uberEatsItemId or uberEatsItemName must be provided',
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

        // Avoid duplicate mapping for the same Uber Eats item ID
        if (dto.uberEatsItemId) {
            const existing = await this.prisma.uberEatsItemMapping.findFirst({
                where: {
                    uberEatsSettingsId: settings.id,
                    uberEatsItemId: dto.uberEatsItemId,
                },
            });
            if (existing) {
                throw new BadRequestException(
                    `A mapping for Uber Eats item ID "${dto.uberEatsItemId}" already exists`,
                );
            }
        }

        return this.prisma.uberEatsItemMapping.create({
            data: {
                uberEatsSettingsId: settings.id,
                menuItemId: dto.menuItemId,
                uberEatsItemId: dto.uberEatsItemId ?? null,
                uberEatsItemName: dto.uberEatsItemName ?? null,
            },
            include: {
                menuItem: { select: { id: true, name: true, price: true } },
            },
        });
    }

    async deleteItemMapping(actor: User, restaurantId: string, mappingId: string) {
        await this.assertRestaurantAccess(actor, restaurantId);

        const settings = await this.requireSettings(restaurantId);

        const mapping = await this.prisma.uberEatsItemMapping.findFirst({
            where: { id: mappingId, uberEatsSettingsId: settings.id },
        });
        if (!mapping) throw new NotFoundException(`Item mapping ${mappingId} not found`);

        await this.prisma.uberEatsItemMapping.delete({ where: { id: mappingId } });
        return { message: 'Item mapping deleted' };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Webhook
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Entry point for incoming Uber Eats webhooks.
     *
     * Called from the webhook controller with the raw body bytes so HMAC
     * verification is accurate.
     */
    async handleWebhook(
        restaurantId: string,
        rawBody: Buffer,
        signature: string | undefined,
    ): Promise<{ received: boolean; event: string; sessionId: string | null }> {
        // 1. Load settings — if not configured, still log and return 200 (avoid retry floods)
        const settings = await this.prisma.uberEatsSettings.findUnique({
            where: { restaurantId },
        });

        let payload: UberEatsWebhookPayload;
        try {
            payload = JSON.parse(rawBody.toString('utf8'));
        } catch {
            this.logger.error(`UberEats: failed to parse JSON body for restaurant ${restaurantId}`);
            await this.logWebhook(restaurantId, null, UberEatsEventType.UNKNOWN, rawBody, null, UberEatsWebhookStatus.FAILED, null, 'Invalid JSON');
            return { received: true, event: 'INVALID_JSON', sessionId: null };
        }

        const eventType = this.mapEventType(payload.event_type, payload.meta?.status);

        if (!settings || !settings.isActive) {
            await this.logWebhook(restaurantId, payload.event_id, eventType, rawBody, payload, UberEatsWebhookStatus.IGNORED, null, 'Uber Eats not configured or inactive');
            return { received: true, event: payload.event_type ?? 'UNKNOWN', sessionId: null };
        }

        // 2. Verify signature
        if (!this.verifySignature(rawBody, signature, settings.webhookSecret)) {
            await this.logWebhook(restaurantId, payload.event_id, eventType, rawBody, payload, UberEatsWebhookStatus.FAILED, null, 'Invalid signature');
            this.logger.warn(`UberEats: signature mismatch for restaurant ${restaurantId}`);
            return { received: true, event: payload.event_type ?? 'UNKNOWN', sessionId: null };
        }

        // 3. Route by event type
        let sessionId: string | null = null;
        let status: UberEatsWebhookStatus = UberEatsWebhookStatus.PROCESSED;
        let errorMsg: string | null = null;

        try {
            if (eventType === UberEatsEventType.ORDER_CREATED && settings.autoCreateOrders) {
                sessionId = await this.processOrderCreated(restaurantId, payload, settings);
            } else {
                // Other event types — just log for now
                status = UberEatsWebhookStatus.IGNORED;
            }
        } catch (err) {
            status = UberEatsWebhookStatus.FAILED;
            errorMsg = err.message;
            this.logger.error(`UberEats order processing error: ${err.message}`, err.stack);
        }

        await this.logWebhook(restaurantId, payload.event_id, eventType, rawBody, payload, status, sessionId, errorMsg);

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
            this.prisma.uberEatsWebhookLog.findMany({
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
                },
            }),
            this.prisma.uberEatsWebhookLog.count({ where }),
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

        const log = await this.prisma.uberEatsWebhookLog.findFirst({
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
        payload: UberEatsWebhookPayload,
        settings: any,
    ): Promise<string> {
        const order = payload.order;
        if (!order) throw new BadRequestException('Webhook payload missing order object');

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            include: { owner: true },
        });
        if (!restaurant) throw new NotFoundException(`Restaurant ${restaurantId} not found`);

        // Load item mappings for this restaurant
        const mappings = await this.prisma.uberEatsItemMapping.findMany({
            where: { uberEatsSettingsId: settings.id },
            include: { menuItem: true },
        });

        // Resolve items → local menu items
        const resolvedItems: {
            menuItemId: string;
            menuItemName: string;
            quantity: number;
            unitPrice: number;
        }[] = [];

        for (const ueItem of order.cart?.items ?? []) {
            const menuItem = await this.resolveMenuItem(restaurantId, ueItem, mappings);

            if (!menuItem) {
                this.logger.warn(
                    `UberEats: could not resolve item "${ueItem.title}" (id: ${ueItem.id}) in restaurant ${restaurantId}. ` +
                    `Add an item mapping via POST /restaurants/${restaurantId}/uber-eats/item-mappings.`,
                );
                continue;
            }

            resolvedItems.push({
                menuItemId: menuItem.id,
                menuItemName: menuItem.name,
                quantity: ueItem.quantity ?? 1,
                unitPrice: ueItem.price?.unit_price?.amount != null
                    ? ueItem.price.unit_price.amount / 100
                    : Number(menuItem.price),
            });
        }

        if (resolvedItems.length === 0) {
            throw new BadRequestException(
                'No items could be resolved from the Uber Eats order. ' +
                'Please add item mappings for all Uber Eats menu items.',
            );
        }

        const customerName =
            [order.eater?.first_name, order.eater?.last_name].filter(Boolean).join(' ') || null;
        const customerPhone = order.eater?.phone ?? null;
        const deliveryAddress = order.delivery_info?.location?.formatted_address ?? null;
        const deliveryFee = order.cart?.delivery_fee != null ? order.cart.delivery_fee / 100 : null;

        const sessionNumber = await this.generateUniqueSessionNumber(restaurantId);

        const session = await this.prisma.orderSession.create({
            data: {
                restaurantId,
                sessionNumber,
                channel: 'UBER_EATS' as any,
                status: 'OPEN' as any,
                externalOrderId: order.id,
                externalChannel: 'Uber Eats',
                customerName,
                customerPhone,
                deliveryAddress,
                deliveryFee,
                specialInstructions: order.cart?.special_instructions ?? null,
                guestCount: 1,
                openedById: restaurant.ownerId,
            },
        });

        const batchNumber = await this.generateUniqueBatchNumber(session.id);

        await this.prisma.orderBatch.create({
            data: {
                sessionId: session.id,
                batchNumber,
                status: 'PENDING' as any,
                notes: `Uber Eats order #${order.display_id ?? order.id}`,
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
            `UberEats: created session ${sessionNumber} for Uber Eats order ${order.id} in restaurant ${restaurantId}`,
        );

        return session.id;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Internal helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Verifies the Uber Eats HMAC-SHA256 signature.
     */
    private verifySignature(
        rawBody: Buffer,
        signatureHeader: string | undefined,
        secret: string,
    ): boolean {
        if (!signatureHeader) return false;

        try {
            // Uber Eats may send signature as a hex-encoded HMAC or in "v1=<hex>" format
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
     * Resolve an Uber Eats order item to a local POS MenuItem.
     * Priority:
     *   1. Exact match on uberEatsItemId in the item mappings
     *   2. Case-insensitive name match in the item mappings
     *   3. Case-insensitive name match directly in the restaurant's menu
     */
    private async resolveMenuItem(
        restaurantId: string,
        ueItem: UberEatsOrderItem,
        mappings: any[],
    ) {
        // 1. ID match
        if (ueItem.id) {
            const byId = mappings.find((m) => m.uberEatsItemId === ueItem.id);
            if (byId) return byId.menuItem;
        }

        // 2. Name match in mappings
        if (ueItem.title) {
            const lowerName = ueItem.title.toLowerCase();
            const byName = mappings.find(
                (m) => m.uberEatsItemName?.toLowerCase() === lowerName,
            );
            if (byName) return byName.menuItem;
        }

        // 3. Direct name match on menu items
        if (ueItem.title) {
            const directMatch = await this.prisma.menuItem.findFirst({
                where: {
                    restaurantId,
                    name: { equals: ueItem.title },
                    isActive: true,
                },
            });
            if (directMatch) return directMatch;
        }

        return null;
    }

    private mapEventType(raw?: string, status?: string): UberEatsEventType {
        // Uber Eats uses a combination of event_type and meta.status
        const statusUpper = (status ?? '').toUpperCase();
        const map: Record<string, UberEatsEventType> = {
            CREATED: UberEatsEventType.ORDER_CREATED,
            ACCEPTED: UberEatsEventType.ORDER_ACCEPTED,
            DENIED: UberEatsEventType.ORDER_DENIED,
            CANCELLED: UberEatsEventType.ORDER_CANCELLED,
            READY_FOR_PICKUP: UberEatsEventType.ORDER_READY_FOR_PICKUP,
            PICKED_UP: UberEatsEventType.ORDER_PICKED_UP,
            DELIVERED: UberEatsEventType.ORDER_DELIVERED,
        };

        if (map[statusUpper]) return map[statusUpper];

        // Fallback: try matching the raw event_type directly
        const rawUpper = (raw ?? '').toUpperCase();
        const directMap: Record<string, UberEatsEventType> = {
            ORDER_CREATED: UberEatsEventType.ORDER_CREATED,
            ORDER_ACCEPTED: UberEatsEventType.ORDER_ACCEPTED,
            ORDER_DENIED: UberEatsEventType.ORDER_DENIED,
            ORDER_CANCELLED: UberEatsEventType.ORDER_CANCELLED,
            ORDER_READY_FOR_PICKUP: UberEatsEventType.ORDER_READY_FOR_PICKUP,
            ORDER_PICKED_UP: UberEatsEventType.ORDER_PICKED_UP,
            ORDER_DELIVERED: UberEatsEventType.ORDER_DELIVERED,
        };
        return directMap[rawUpper] ?? UberEatsEventType.UNKNOWN;
    }

    private async logWebhook(
        restaurantId: string,
        eventId: string | null | undefined,
        eventType: UberEatsEventType,
        rawBody: Buffer,
        parsed: UberEatsWebhookPayload | null,
        status: UberEatsWebhookStatus,
        sessionId: string | null,
        errorMessage: string | null,
    ) {
        try {
            await this.prisma.uberEatsWebhookLog.create({
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
            this.logger.error(`UberEats: failed to write webhook log: ${logErr.message}`);
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

    private buildWebhookUrlHint(restaurantId: string): string {
        return `/api/v1/uber-eats/webhook/${restaurantId}`;
    }

    private async requireSettings(restaurantId: string) {
        const settings = await this.prisma.uberEatsSettings.findUnique({
            where: { restaurantId },
        });
        if (!settings) {
            throw new NotFoundException(
                'Uber Eats integration is not configured for this restaurant. ' +
                'Set it up via PUT /restaurants/:id/uber-eats/settings.',
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
            throw new ForbiddenException('Only OWNER, RESTAURANT_ADMIN or SUPER_ADMIN can manage Uber Eats settings');
        }
    }
}
