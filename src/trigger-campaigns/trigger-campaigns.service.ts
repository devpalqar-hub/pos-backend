import {
    Injectable,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import {
    User,
    UserRole,
    TriggerCampaignStatus,
    TriggerRuleCondition,
    RuleGroupOperator,
    MarketingChannel,
    RecipientDeliveryStatus,
} from '@prisma/client';
import { CreateTriggerCampaignDto } from './dto/create-trigger-campaign.dto';
import { UpdateTriggerCampaignDto } from './dto/update-trigger-campaign.dto';

@Injectable()
export class TriggerCampaignsService {
    private readonly logger = new Logger(TriggerCampaignsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CRUD
    // ═══════════════════════════════════════════════════════════════════════════

    async create(actor: User, restaurantId: string, dto: CreateTriggerCampaignDto) {
        await this.assertAccess(actor, restaurantId);
        await this.assertChannelSettings(restaurantId, dto.channels as unknown as MarketingChannel[]);

        return this.prisma.triggerCampaign.create({
            data: {
                restaurantId,
                createdById: actor.id,
                name: dto.name,
                description: dto.description ?? null,
                subject: dto.subject ?? null,
                textContent: dto.textContent ?? null,
                htmlContent: dto.htmlContent ?? null,
                imageUrl: dto.imageUrl ?? null,
                ruleOperator: (dto.ruleOperator as unknown as RuleGroupOperator) ?? RuleGroupOperator.AND,
                repeatDelayDays: dto.repeatDelayDays ?? 1,
                maxTriggersPerCustomer: dto.maxTriggersPerCustomer ?? null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                rules: {
                    create: (dto.rules ?? []).map((r) => ({
                        condition: r.condition as unknown as TriggerRuleCondition,
                        value: r.value ?? null,
                    })),
                },
                channels: {
                    create: (dto.channels as unknown as MarketingChannel[]).map((ch) => ({
                        channel: ch,
                    })),
                },
            },
            include: { rules: true, channels: true },
        });
    }

    async findAll(
        actor: User,
        restaurantId: string,
        page = 1,
        limit = 10,
        status?: TriggerCampaignStatus,
        search?: string,
    ) {
        await this.assertAccess(actor, restaurantId);

        const where: any = {
            restaurantId,
            isActive: true,
            ...(status && { status }),
            ...(search && {
                OR: [
                    { name: { contains: search } },
                    { description: { contains: search } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            this.prisma.triggerCampaign.findMany({
                where,
                include: { rules: true, channels: true },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.triggerCampaign.count({ where }),
        ]);

        return {
            data,
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

    async findOne(actor: User, restaurantId: string, id: string) {
        await this.assertAccess(actor, restaurantId);

        const campaign = await this.prisma.triggerCampaign.findFirst({
            where: { id, restaurantId, isActive: true },
            include: { rules: true, channels: true },
        });
        if (!campaign) throw new NotFoundException(`Trigger campaign ${id} not found`);
        return campaign;
    }

    async update(actor: User, restaurantId: string, id: string, dto: UpdateTriggerCampaignDto) {
        await this.assertAccess(actor, restaurantId);

        const campaign = await this.prisma.triggerCampaign.findFirst({
            where: { id, restaurantId, isActive: true },
        });
        if (!campaign) throw new NotFoundException(`Trigger campaign ${id} not found`);

        if (campaign.status === TriggerCampaignStatus.EXPIRED) {
            throw new BadRequestException('Cannot edit an EXPIRED trigger campaign');
        }

        if (dto.channels) {
            await this.assertChannelSettings(restaurantId, dto.channels as unknown as MarketingChannel[]);
        }

        return this.prisma.$transaction(async (tx) => {
            if (dto.rules !== undefined) {
                await tx.triggerCampaignRule.deleteMany({ where: { triggerCampaignId: id } });
                await tx.triggerCampaignRule.createMany({
                    data: dto.rules.map((r) => ({
                        triggerCampaignId: id,
                        condition: r.condition as unknown as TriggerRuleCondition,
                        value: r.value ?? null,
                    })),
                });
            }

            if (dto.channels !== undefined) {
                await tx.triggerCampaignChannel.deleteMany({ where: { triggerCampaignId: id } });
                await tx.triggerCampaignChannel.createMany({
                    data: (dto.channels as unknown as MarketingChannel[]).map((ch) => ({
                        triggerCampaignId: id,
                        channel: ch,
                    })),
                });
            }

            return tx.triggerCampaign.update({
                where: { id },
                data: {
                    ...(dto.name !== undefined && { name: dto.name }),
                    ...(dto.description !== undefined && { description: dto.description }),
                    ...(dto.subject !== undefined && { subject: dto.subject }),
                    ...(dto.textContent !== undefined && { textContent: dto.textContent }),
                    ...(dto.htmlContent !== undefined && { htmlContent: dto.htmlContent }),
                    ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
                    ...(dto.ruleOperator !== undefined && {
                        ruleOperator: dto.ruleOperator as unknown as RuleGroupOperator,
                    }),
                    ...(dto.repeatDelayDays !== undefined && { repeatDelayDays: dto.repeatDelayDays }),
                    ...(dto.maxTriggersPerCustomer !== undefined && {
                        maxTriggersPerCustomer: dto.maxTriggersPerCustomer,
                    }),
                    ...(dto.expiresAt !== undefined && {
                        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                    }),
                },
                include: { rules: true, channels: true },
            });
        });
    }

    async remove(actor: User, restaurantId: string, id: string) {
        await this.assertAccess(actor, restaurantId);

        const campaign = await this.prisma.triggerCampaign.findFirst({
            where: { id, restaurantId, isActive: true },
        });
        if (!campaign) throw new NotFoundException(`Trigger campaign ${id} not found`);

        await this.prisma.triggerCampaign.update({
            where: { id },
            data: { isActive: false },
        });

        return { message: 'Trigger campaign deleted successfully' };
    }

    async pause(actor: User, restaurantId: string, id: string) {
        await this.assertAccess(actor, restaurantId);

        const campaign = await this.prisma.triggerCampaign.findFirst({
            where: { id, restaurantId, isActive: true },
        });
        if (!campaign) throw new NotFoundException(`Trigger campaign ${id} not found`);

        if (campaign.status !== TriggerCampaignStatus.ACTIVE) {
            throw new BadRequestException('Only ACTIVE trigger campaigns can be paused');
        }

        await this.prisma.triggerCampaign.update({
            where: { id },
            data: { status: TriggerCampaignStatus.PAUSED },
        });

        return { message: 'Trigger campaign paused' };
    }

    async resume(actor: User, restaurantId: string, id: string) {
        await this.assertAccess(actor, restaurantId);

        const campaign = await this.prisma.triggerCampaign.findFirst({
            where: { id, restaurantId, isActive: true },
        });
        if (!campaign) throw new NotFoundException(`Trigger campaign ${id} not found`);

        if (campaign.status !== TriggerCampaignStatus.PAUSED) {
            throw new BadRequestException('Only PAUSED trigger campaigns can be resumed');
        }

        if (campaign.expiresAt && campaign.expiresAt <= new Date()) {
            throw new BadRequestException('Cannot resume — campaign has expired');
        }

        await this.prisma.triggerCampaign.update({
            where: { id },
            data: { status: TriggerCampaignStatus.ACTIVE },
        });

        return { message: 'Trigger campaign resumed' };
    }

    async getAnalytics(actor: User, restaurantId: string, id: string) {
        await this.assertAccess(actor, restaurantId);

        const campaign = await this.prisma.triggerCampaign.findFirst({
            where: { id, restaurantId, isActive: true },
            include: { rules: true, channels: true },
        });
        if (!campaign) throw new NotFoundException(`Trigger campaign ${id} not found`);

        const [totalTriggers, uniqueCustomers, recentLogs] = await Promise.all([
            this.prisma.triggerCampaignLog.count({
                where: { triggerCampaignId: id },
            }),
            this.prisma.triggerCampaignTracker.count({
                where: { triggerCampaignId: id },
            }),
            this.prisma.triggerCampaignLog.findMany({
                where: { triggerCampaignId: id },
                orderBy: { createdAt: 'desc' },
                take: 200,
                include: {
                    customer: { select: { id: true, name: true, phone: true, email: true } },
                },
            }),
        ]);

        const sentCount = await this.prisma.triggerCampaignLog.count({
            where: { triggerCampaignId: id, status: RecipientDeliveryStatus.SENT },
        });
        const failedCount = await this.prisma.triggerCampaignLog.count({
            where: { triggerCampaignId: id, status: RecipientDeliveryStatus.FAILED },
        });

        return {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            expiresAt: campaign.expiresAt,
            repeatDelayDays: campaign.repeatDelayDays,
            maxTriggersPerCustomer: campaign.maxTriggersPerCustomer,
            counters: {
                totalMessagesSent: totalTriggers,
                uniqueCustomersReached: uniqueCustomers,
                sent: sentCount,
                failed: failedCount,
                deliveryRate: totalTriggers > 0
                    ? ((sentCount / totalTriggers) * 100).toFixed(1) + '%'
                    : 'N/A',
            },
            recentLogs,
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Scheduler — evaluate trigger campaigns every 5 minutes
    // ═══════════════════════════════════════════════════════════════════════════

    @Cron(CronExpression.EVERY_5_MINUTES)
    async evaluateTriggerCampaigns() {
        const now = new Date();

        // Expire campaigns that have passed their expiration date
        await this.prisma.triggerCampaign.updateMany({
            where: {
                status: TriggerCampaignStatus.ACTIVE,
                isActive: true,
                expiresAt: { lte: now },
            },
            data: { status: TriggerCampaignStatus.EXPIRED },
        });

        // Find all ACTIVE trigger campaigns
        const campaigns = await this.prisma.triggerCampaign.findMany({
            where: {
                status: TriggerCampaignStatus.ACTIVE,
                isActive: true,
            },
            include: {
                rules: true,
                channels: true,
            },
        });

        for (const campaign of campaigns) {
            try {
                await this.evaluateSingleCampaign(campaign);
            } catch (err) {
                this.logger.error(
                    `Trigger campaign ${campaign.id} evaluation failed: ${err.message}`,
                    err.stack,
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Internal: Single campaign evaluation
    // ═══════════════════════════════════════════════════════════════════════════

    private async evaluateSingleCampaign(campaign: any) {
        const restaurantId = campaign.restaurantId;

        // Get all active customers
        const customers = await this.prisma.customer.findMany({
            where: { restaurantId, isActive: true },
        });

        if (customers.length === 0) return;

        // Pre-fetch order data for the restaurant
        const sessions = await this.prisma.orderSession.findMany({
            where: {
                restaurantId,
                customerPhone: { not: null },
                status: { in: ['PAID', 'BILLED'] as any },
            },
            select: {
                customerPhone: true,
                channel: true,
                createdAt: true,
                totalAmount: true,
            },
        });

        // Build per-phone order stats
        type PhoneStats = {
            orderCount: number;
            totalSpend: number;
            lastOrderDate: Date | null;
            orderDates: Date[];
            channels: Set<string>;
        };
        const phoneStats = new Map<string, PhoneStats>();

        for (const s of sessions) {
            if (!s.customerPhone) continue;
            const curr = phoneStats.get(s.customerPhone) ?? {
                orderCount: 0,
                totalSpend: 0,
                lastOrderDate: null,
                orderDates: [],
                channels: new Set<string>(),
            };
            curr.orderCount++;
            curr.totalSpend += Number(s.totalAmount ?? 0);
            curr.orderDates.push(s.createdAt);
            if (!curr.lastOrderDate || s.createdAt > curr.lastOrderDate) {
                curr.lastOrderDate = s.createdAt;
            }
            curr.channels.add(s.channel);
            phoneStats.set(s.customerPhone, curr);
        }

        // Pre-fetch order items per phone (for ORDERED_ITEMS rule)
        const orderedItemsByPhone = await this.getOrderedItemsByPhone(restaurantId);

        // Pre-fetch loyalty points per customer
        const loyaltyMap = await this.getLoyaltyPointsMap(restaurantId);

        // Pre-fetch existing trackers for this campaign
        const existingTrackers = await this.prisma.triggerCampaignTracker.findMany({
            where: { triggerCampaignId: campaign.id },
        });
        const trackerMap = new Map(
            existingTrackers.map((t) => [t.customerId, t]),
        );

        // Get settings for sending
        const settings = await this.prisma.marketingSettings.findUnique({
            where: { restaurantId },
        });
        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
        });
        if (!restaurant) return;

        const selectedChannels = campaign.channels.map((c: any) => c.channel);
        const now = new Date();

        for (const customer of customers) {
            // 1. Check tracker limits
            const tracker = trackerMap.get(customer.id);

            if (tracker) {
                // Check max trigger count
                if (
                    campaign.maxTriggersPerCustomer !== null &&
                    tracker.triggerCount >= campaign.maxTriggersPerCustomer
                ) {
                    continue;
                }

                // Check repeat delay
                if (tracker.lastTriggeredAt) {
                    const daysSinceLast =
                        (now.getTime() - tracker.lastTriggeredAt.getTime()) / (1000 * 60 * 60 * 24);
                    if (daysSinceLast < campaign.repeatDelayDays) {
                        continue;
                    }
                }
            }

            // 2. Evaluate rules
            const stats = phoneStats.get(customer.phone) ?? {
                orderCount: 0,
                totalSpend: 0,
                lastOrderDate: null as Date | null,
                orderDates: [] as Date[],
                channels: new Set<string>(),
            };
            const customerOrderedItems = orderedItemsByPhone.get(customer.phone) ?? new Set<string>();
            const loyaltyPoints = loyaltyMap.get(customer.id) ?? 0;

            const eligible = this.evaluateRules(
                campaign.rules,
                campaign.ruleOperator,
                stats,
                customerOrderedItems,
                loyaltyPoints,
            );

            if (!eligible) continue;

            // 3. Send message via all channels
            const customerName = customer.name || 'Customer';
            const restaurantName = restaurant.name;

            for (const ch of selectedChannels) {
                let success = false;
                let errorMsg: string | null = null;

                try {
                    if (ch === MarketingChannel.EMAIL) {
                        if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
                            throw new Error('SMTP not configured');
                        }
                        if (!customer.email) throw new Error('Customer has no email');
                        await this.sendEmail(settings, customer.email, campaign, customerName, restaurantName);
                    } else if (ch === MarketingChannel.SMS) {
                        if (!settings?.twilioAccountSid || !settings?.twilioAuthToken) {
                            throw new Error('Twilio not configured');
                        }
                        if (!customer.phone) throw new Error('Customer has no phone');
                        await this.sendSms(settings, customer.phone, campaign, customerName, restaurantName);
                    } else if (ch === MarketingChannel.WHATSAPP) {
                        if (!settings?.waPhoneNumberId || !settings?.waAccessToken) {
                            throw new Error('WhatsApp not configured');
                        }
                        if (!customer.phone) throw new Error('Customer has no phone');
                        await this.sendWhatsapp(settings, customer.phone, campaign, customerName, restaurantName);
                    }
                    success = true;
                } catch (err) {
                    errorMsg = err.message;
                    this.logger.warn(
                        `Trigger campaign ${campaign.id} — failed to send ${ch} to customer ${customer.id}: ${errorMsg}`,
                    );
                }

                // Log the send attempt
                await this.prisma.triggerCampaignLog.create({
                    data: {
                        triggerCampaignId: campaign.id,
                        customerId: customer.id,
                        channel: ch,
                        status: success ? RecipientDeliveryStatus.SENT : RecipientDeliveryStatus.FAILED,
                        sentAt: success ? now : null,
                        errorMsg,
                    },
                });
            }

            // 4. Upsert tracker
            await this.prisma.triggerCampaignTracker.upsert({
                where: {
                    triggerCampaignId_customerId: {
                        triggerCampaignId: campaign.id,
                        customerId: customer.id,
                    },
                },
                create: {
                    triggerCampaignId: campaign.id,
                    customerId: customer.id,
                    triggerCount: 1,
                    lastTriggeredAt: now,
                },
                update: {
                    triggerCount: { increment: 1 },
                    lastTriggeredAt: now,
                },
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Internal: Rule evaluation
    // ═══════════════════════════════════════════════════════════════════════════

    private evaluateRules(
        rules: { condition: TriggerRuleCondition; value: string | null }[],
        operator: RuleGroupOperator,
        stats: {
            orderCount: number;
            totalSpend: number;
            lastOrderDate: Date | null;
            orderDates: Date[];
            channels: Set<string>;
        },
        orderedItems: Set<string>,
        loyaltyPoints: number,
    ): boolean {
        // No rules → all customers eligible
        if (!rules || rules.length === 0) return true;

        const results = rules.map((rule) => {
            switch (rule.condition) {
                case TriggerRuleCondition.VISITED_IN_DATE_RANGE: {
                    if (!rule.value) return false;
                    try {
                        const { startDate, endDate } = JSON.parse(rule.value);
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        return stats.orderDates.some((d) => d >= start && d <= end);
                    } catch {
                        return false;
                    }
                }

                case TriggerRuleCondition.VISITED_ON_DAY: {
                    if (!rule.value) return false;
                    const targetDays = rule.value.split(',').map((d) => d.trim().toUpperCase());
                    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
                    return stats.orderDates.some((d) => {
                        const dayName = dayNames[d.getDay()];
                        return targetDays.includes(dayName);
                    });
                }

                case TriggerRuleCondition.ORDERED_ITEMS: {
                    if (!rule.value) return false;
                    try {
                        const targetItems: string[] = JSON.parse(rule.value);
                        return targetItems.some((itemId) => orderedItems.has(itemId));
                    } catch {
                        return false;
                    }
                }

                case TriggerRuleCondition.HAS_PENDING_LOYALTY: {
                    const minPoints = rule.value ? Number(rule.value) : 0;
                    return loyaltyPoints > minPoints;
                }

                case TriggerRuleCondition.MIN_VISIT_COUNT: {
                    const minVisits = Number(rule.value ?? 0);
                    return stats.orderCount >= minVisits;
                }

                case TriggerRuleCondition.MIN_SPEND_AMOUNT: {
                    const minSpend = Number(rule.value ?? 0);
                    return stats.totalSpend >= minSpend;
                }

                default:
                    return false;
            }
        });

        return operator === RuleGroupOperator.AND
            ? results.every(Boolean)
            : results.some(Boolean);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Internal: Data helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private async getOrderedItemsByPhone(restaurantId: string): Promise<Map<string, Set<string>>> {
        const rows = await this.prisma.orderItem.findMany({
            where: {
                batch: {
                    session: {
                        restaurantId,
                        customerPhone: { not: null },
                        status: { in: ['PAID', 'BILLED'] as any },
                    },
                },
                status: { not: 'CANCELLED' as any },
            },
            select: {
                menuItemId: true,
                batch: {
                    select: {
                        session: {
                            select: { customerPhone: true },
                        },
                    },
                },
            },
        });

        const map = new Map<string, Set<string>>();
        for (const row of rows) {
            const phone = row.batch.session.customerPhone;
            if (!phone) continue;
            if (!map.has(phone)) map.set(phone, new Set());
            map.get(phone)!.add(row.menuItemId);
        }
        return map;
    }

    private async getLoyaltyPointsMap(restaurantId: string): Promise<Map<string, number>> {
        const rows = await this.prisma.loyalityPointRedemption.findMany({
            where: { loyalityPoint: { restaurantId } },
            select: { customerId: true, pointsAwarded: true },
        });
        const map = new Map<string, number>();
        for (const r of rows) {
            map.set(r.customerId, (map.get(r.customerId) ?? 0) + Number(r.pointsAwarded));
        }
        return map;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Internal: Channel senders (mirrors MarketingService)
    // ═══════════════════════════════════════════════════════════════════════════

    private renderTemplate(
        template: string,
        customerName: string,
        restaurantName: string,
        imageUrl?: string | null,
    ): string {
        return template
            .replace(/\{\{name\}\}/g, customerName)
            .replace(/\{\{restaurant\}\}/g, restaurantName)
            .replace(/\{\{imageUrl\}\}/g, imageUrl ?? '');
    }

    private async sendEmail(
        settings: any,
        toEmail: string,
        campaign: any,
        customerName: string,
        restaurantName: string,
    ) {
        const transporter = nodemailer.createTransport({
            host: settings.smtpHost,
            port: settings.smtpPort ?? 587,
            secure: settings.smtpSecure ?? true,
            auth: { user: settings.smtpUser, pass: settings.smtpPassword },
        });

        const subject = this.renderTemplate(
            campaign.subject ?? campaign.name,
            customerName,
            restaurantName,
            campaign.imageUrl,
        );

        const htmlBody = campaign.htmlContent
            ? this.renderTemplate(campaign.htmlContent, customerName, restaurantName, campaign.imageUrl)
            : this.buildDefaultHtml(campaign, customerName, restaurantName);

        const textBody = campaign.textContent
            ? this.renderTemplate(campaign.textContent, customerName, restaurantName, campaign.imageUrl)
            : undefined;

        await transporter.sendMail({
            from: `"${settings.smtpFromName ?? restaurantName}" <${settings.smtpFromEmail}>`,
            to: toEmail,
            subject,
            html: htmlBody,
            text: textBody,
        });
    }

    private buildDefaultHtml(campaign: any, customerName: string, restaurantName: string): string {
        const text = campaign.textContent
            ? this.renderTemplate(campaign.textContent, customerName, restaurantName, campaign.imageUrl)
            : '';
        const img = campaign.imageUrl
            ? `<img src="${campaign.imageUrl}" alt="Promotion" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />`
            : '';

        return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <tr><td style="background:#1a1a2e;padding:24px 32px;text-align:center;">
          <span style="color:#fff;font-size:22px;font-weight:700;">${restaurantName}</span>
        </td></tr>
        <tr><td style="padding:32px;">
          ${img}
          <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">Hi ${customerName}!</h2>
          <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">${text}</p>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:16px 32px;text-align:center;color:#999;font-size:12px;">
          &copy; ${new Date().getFullYear()} ${restaurantName}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    }

    private async sendSms(
        settings: any,
        toPhone: string,
        campaign: any,
        customerName: string,
        restaurantName: string,
    ) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        const client = twilio(settings.twilioAccountSid, settings.twilioAuthToken);

        const body = this.renderTemplate(
            campaign.textContent ?? campaign.name,
            customerName,
            restaurantName,
            campaign.imageUrl,
        );

        await client.messages.create({
            body,
            from: settings.twilioFromNumber,
            to: toPhone,
        });
    }

    private async sendWhatsapp(
        settings: any,
        toPhone: string,
        campaign: any,
        customerName: string,
        restaurantName: string,
    ) {
        const body = this.renderTemplate(
            campaign.textContent ?? campaign.name,
            customerName,
            restaurantName,
            campaign.imageUrl,
        );

        await axios.post(
            `https://graph.facebook.com/v18.0/${settings.waPhoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'text',
                text: { body },
            },
            {
                headers: {
                    Authorization: `Bearer ${settings.waAccessToken}`,
                    'Content-Type': 'application/json',
                },
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  Internal: Validation
    // ═══════════════════════════════════════════════════════════════════════════

    private async assertAccess(actor: User, restaurantId: string) {
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
            throw new ForbiddenException('Only OWNER, RESTAURANT_ADMIN and SUPER_ADMIN can manage trigger campaigns');
        }
    }

    private async assertChannelSettings(restaurantId: string, channels: MarketingChannel[]) {
        if (!channels || channels.length === 0) {
            throw new BadRequestException('At least one channel must be selected');
        }

        const settings = await this.prisma.marketingSettings.findUnique({
            where: { restaurantId },
        });

        const missing: string[] = [];

        if (channels.includes(MarketingChannel.EMAIL)) {
            if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
                missing.push('SMTP email (configure via PUT /marketing/settings)');
            }
        }
        if (channels.includes(MarketingChannel.SMS)) {
            if (!settings?.twilioAccountSid || !settings?.twilioAuthToken) {
                missing.push('Twilio SMS (configure via PUT /marketing/settings)');
            }
        }
        if (channels.includes(MarketingChannel.WHATSAPP)) {
            if (!settings?.waPhoneNumberId || !settings?.waAccessToken) {
                missing.push('WhatsApp Business API (configure via PUT /marketing/settings)');
            }
        }

        if (missing.length) {
            throw new BadRequestException(
                `Missing channel configuration: ${missing.join('; ')}`,
            );
        }
    }
}
