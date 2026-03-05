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
  CampaignStatus,
  MarketingChannel,
  RecipientDeliveryStatus,
  RuleConditionType,
  RuleGroupOperator,
} from '@prisma/client';
import { UpsertMarketingSettingsDto } from './dto/upsert-settings.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { TriggerCampaignDto } from './dto/trigger-campaign.dto';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  //  Marketing Settings
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettings(actor: User, restaurantId: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const settings = await this.prisma.marketingSettings.findUnique({
      where: { restaurantId },
    });

    if (!settings) {
      return {
        restaurantId,
        smtp: null,
        twilio: null,
        whatsapp: null,
      };
    }

    // Return masked sensitive fields ─ never send raw credentials in the response
    return {
      restaurantId: settings.restaurantId,
      smtp: {
        host: settings.smtpHost,
        port: settings.smtpPort,
        user: settings.smtpUser,
        password: settings.smtpPassword ? '••••••••' : null,
        fromEmail: settings.smtpFromEmail,
        fromName: settings.smtpFromName,
        secure: settings.smtpSecure,
        configured: !!(settings.smtpHost && settings.smtpUser && settings.smtpPassword),
      },
      twilio: {
        accountSid: settings.twilioAccountSid,
        authToken: settings.twilioAuthToken ? '••••••••' : null,
        fromNumber: settings.twilioFromNumber,
        configured: !!(settings.twilioAccountSid && settings.twilioAuthToken),
      },
      whatsapp: {
        baId: settings.waBaId,
        phoneNumberId: settings.waPhoneNumberId,
        accessToken: settings.waAccessToken ? '••••••••' : null,
        configured: !!(settings.waPhoneNumberId && settings.waAccessToken),
      },
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  async upsertSettings(
    actor: User,
    restaurantId: string,
    dto: UpsertMarketingSettingsDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    // If password fields are '••••••••' (masked), don't overwrite them
    const data: any = { restaurantId };
    if (dto.smtpHost !== undefined) data.smtpHost = dto.smtpHost;
    if (dto.smtpPort !== undefined) data.smtpPort = dto.smtpPort;
    if (dto.smtpUser !== undefined) data.smtpUser = dto.smtpUser;
    if (dto.smtpPassword !== undefined && dto.smtpPassword !== '••••••••')
      data.smtpPassword = dto.smtpPassword;
    if (dto.smtpFromEmail !== undefined) data.smtpFromEmail = dto.smtpFromEmail;
    if (dto.smtpFromName !== undefined) data.smtpFromName = dto.smtpFromName;
    if (dto.smtpSecure !== undefined) data.smtpSecure = dto.smtpSecure;

    if (dto.twilioAccountSid !== undefined) data.twilioAccountSid = dto.twilioAccountSid;
    if (dto.twilioAuthToken !== undefined && dto.twilioAuthToken !== '••••••••')
      data.twilioAuthToken = dto.twilioAuthToken;
    if (dto.twilioFromNumber !== undefined) data.twilioFromNumber = dto.twilioFromNumber;

    if (dto.waBaId !== undefined) data.waBaId = dto.waBaId;
    if (dto.waPhoneNumberId !== undefined) data.waPhoneNumberId = dto.waPhoneNumberId;
    if (dto.waAccessToken !== undefined && dto.waAccessToken !== '••••••••')
      data.waAccessToken = dto.waAccessToken;

    await this.prisma.marketingSettings.upsert({
      where: { restaurantId },
      create: data,
      update: data,
    });

    return this.getSettings(actor, restaurantId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Campaign CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async createCampaign(
    actor: User,
    restaurantId: string,
    dto: CreateCampaignDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    // Validate channel prerequisites
    await this.assertChannelSettings(restaurantId, dto.channels as unknown as MarketingChannel[]);

    const campaign = await this.prisma.campaign.create({
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
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.RUNNING,
        rules: {
          create: (dto.rules ?? []).map((r) => ({
            condition: r.condition as unknown as RuleConditionType,
            value: r.value ?? null,
          })),
        },
        channels: {
          create: (dto.channels as unknown as MarketingChannel[]).map((ch) => ({
            channel: ch,
          })),
        },
      },
      include: {
        rules: true,
        channels: true,
      },
    });

    // If no scheduledAt, execute immediately (async, fire-and-forget)
    if (!dto.scheduledAt) {
      this.executeCampaign(campaign.id).catch((err) =>
        this.logger.error(`Campaign ${campaign.id} execution failed: ${err.message}`, err.stack),
      );
    }

    return campaign;
  }

  async findAllCampaigns(
    actor: User,
    restaurantId: string,
    page = 1,
    limit = 10,
    status?: CampaignStatus,
    search?: string,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

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

    const [campaigns, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        include: { rules: true, channels: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      data: campaigns,
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

  async findOneCampaign(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId, isActive: true },
      include: {
        rules: true,
        channels: true,
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    return campaign;
  }

  async updateCampaign(
    actor: User,
    restaurantId: string,
    id: string,
    dto: UpdateCampaignDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId, isActive: true },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (
      campaign.status !== CampaignStatus.PAUSED &&
      campaign.status !== CampaignStatus.SCHEDULED
    ) {
      throw new BadRequestException(
        `Only PAUSED or SCHEDULED campaigns can be edited. Current status: ${campaign.status}`,
      );
    }

    // Validate new channels if provided
    if (dto.channels) {
      await this.assertChannelSettings(restaurantId, dto.channels as unknown as MarketingChannel[]);
    }

    return this.prisma.$transaction(async (tx) => {
      // Replace rules
      if (dto.rules !== undefined) {
        await tx.campaignRule.deleteMany({ where: { campaignId: id } });
        await tx.campaignRule.createMany({
          data: dto.rules.map((r) => ({
            campaignId: id,
            condition: r.condition as unknown as RuleConditionType,
            value: r.value ?? null,
          })),
        });
      }

      // Replace channels
      if (dto.channels !== undefined) {
        await tx.campaignChannelStat.deleteMany({ where: { campaignId: id } });
        await tx.campaignChannelStat.createMany({
          data: (dto.channels as unknown as MarketingChannel[]).map((ch) => ({
            campaignId: id,
            channel: ch,
          })),
        });
      }

      return tx.campaign.update({
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
          ...(dto.scheduledAt !== undefined && {
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
            status: CampaignStatus.SCHEDULED,
          }),
        },
        include: { rules: true, channels: true },
      });
    });
  }

  async deleteCampaign(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId, isActive: true },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot delete a RUNNING campaign. Pause it first.');
    }

    await this.prisma.campaign.update({ where: { id }, data: { isActive: false } });
    return { message: 'Campaign deleted successfully' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Trigger / Pause / Retrigger
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Trigger a campaign immediately or schedule it.
   * Can also be used to RE-TRIGGER a COMPLETED or CANCELLED campaign
   * (it will create fresh recipient records and re-send).
   */
  async triggerCampaign(
    actor: User,
    restaurantId: string,
    id: string,
    dto: TriggerCampaignDto,
  ) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId, isActive: true },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Campaign is already running');
    }

    if (dto.scheduledAt) {
      const scheduleDate = new Date(dto.scheduledAt);
      if (scheduleDate <= new Date()) {
        throw new BadRequestException('scheduledAt must be a future datetime');
      }

      await this.prisma.campaign.update({
        where: { id },
        data: { status: CampaignStatus.SCHEDULED, scheduledAt: scheduleDate },
      });

      return { message: `Campaign scheduled for ${scheduleDate.toISOString()}` };
    }

    // Immediate send — run asynchronously so the HTTP response returns quickly
    this.executeCampaign(id).catch((err) =>
      this.logger.error(`Campaign ${id} execution failed: ${err.message}`, err.stack),
    );

    return { message: 'Campaign triggered. Sending in progress…' };
  }

  async pauseCampaign(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId, isActive: true },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (campaign.status !== CampaignStatus.RUNNING && campaign.status !== CampaignStatus.SCHEDULED) {
      throw new BadRequestException('Only RUNNING or SCHEDULED campaigns can be paused');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    return { message: 'Campaign paused' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getCampaignAnalytics(actor: User, restaurantId: string, id: string) {
    await this.assertRestaurantAccess(actor, restaurantId, 'manage');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, restaurantId, isActive: true },
      include: {
        rules: true,
        channels: true,
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    // Per-channel breakdown from CampaignChannelStat
    const channelStats = await this.prisma.campaignChannelStat.findMany({
      where: { campaignId: id },
    });

    // Recent recipients (latest 200)
    const recipients = await this.prisma.campaignRecipient.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    const deliveryRate =
      campaign.sentCount > 0
        ? ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1) + '%'
        : 'N/A';

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      counters: {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.sentCount,
        delivered: campaign.deliveredCount,
        failed: campaign.failedCount,
        pending:
          campaign.totalRecipients -
          campaign.sentCount -
          campaign.failedCount,
        deliveryRate,
      },
      channelBreakdown: channelStats,
      recentRecipients: recipients,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Scheduler — auto-trigger scheduled campaigns
  // ═══════════════════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    const dueCampaigns = await this.prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        scheduledAt: { lte: new Date() },
        isActive: true,
      },
      select: { id: true },
    });

    for (const { id } of dueCampaigns) {
      this.executeCampaign(id).catch((err) =>
        this.logger.error(`Scheduled campaign ${id} failed: ${err.message}`, err.stack),
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Internal: Campaign Execution
  // ═══════════════════════════════════════════════════════════════════════════

  private async executeCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { rules: true, channels: true },
    });
    if (!campaign) return;

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: campaign.restaurantId },
    });
    if (!restaurant) return;

    const settings = await this.prisma.marketingSettings.findUnique({
      where: { restaurantId: campaign.restaurantId },
    });

    // Mark as RUNNING
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    });

    try {
      // 1. Resolve eligible customers
      const customers = await this.resolveRecipients(
        campaign.restaurantId,
        campaign.rules,
        campaign.ruleOperator,
      );

      const selectedChannels = campaign.channels.map((c) => c.channel);

      // 2. Reset analytics counters for retrigger
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          totalRecipients: customers.length * selectedChannels.length,
          sentCount: 0,
          deliveredCount: 0,
          failedCount: 0,
        },
      });

      // 3. Reset channel stats
      for (const ch of selectedChannels) {
        await this.prisma.campaignChannelStat.upsert({
          where: { campaignId_channel: { campaignId, channel: ch } },
          create: {
            campaignId,
            channel: ch,
            sentCount: 0,
            deliveredCount: 0,
            failedCount: 0,
          },
          update: { sentCount: 0, deliveredCount: 0, failedCount: 0 },
        });
      }

      // 4. Clear old recipient records for retrigger
      await this.prisma.campaignRecipient.deleteMany({ where: { campaignId } });

      // 5. Build and persist recipient rows
      const recipientRows: {
        campaignId: string;
        customerId: string;
        channel: MarketingChannel;
        phone: string | null;
        email: string | null;
      }[] = [];

      for (const customer of customers) {
        for (const ch of selectedChannels) {
          recipientRows.push({
            campaignId,
            customerId: customer.id,
            channel: ch,
            phone: customer.phone ?? null,
            email: customer.email ?? null,
          });
        }
      }

      await this.prisma.campaignRecipient.createMany({ data: recipientRows });

      // 6. Fetch persisted recipients for processing
      const recipients = await this.prisma.campaignRecipient.findMany({
        where: { campaignId },
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      // 7. Send to each recipient
      let totalSent = 0;
      let totalDelivered = 0;
      let totalFailed = 0;
      const chSent: Record<string, number> = {};
      const chDelivered: Record<string, number> = {};
      const chFailed: Record<string, number> = {};

      for (const recipient of recipients) {
        const ch = recipient.channel;
        chSent[ch] = (chSent[ch] || 0);
        chDelivered[ch] = (chDelivered[ch] || 0);
        chFailed[ch] = (chFailed[ch] || 0);

        let success = false;
        let errorMsg: string | null = null;

        try {
          const customerName = recipient.customer.name || 'Customer';
          const restaurantName = restaurant.name;

          if (ch === MarketingChannel.EMAIL) {
            if (!settings?.smtpHost || !settings?.smtpUser || !settings?.smtpPassword) {
              throw new Error('SMTP not configured for this restaurant');
            }
            if (!recipient.email) {
              throw new Error('Customer has no email address');
            }
            await this.sendEmail(settings, recipient.email, campaign, customerName, restaurantName);
          } else if (ch === MarketingChannel.SMS) {
            if (!settings?.twilioAccountSid || !settings?.twilioAuthToken) {
              throw new Error('Twilio not configured for this restaurant');
            }
            if (!recipient.phone) {
              throw new Error('Customer has no phone number');
            }
            await this.sendSms(settings, recipient.phone, campaign, customerName, restaurantName);
          } else if (ch === MarketingChannel.WHATSAPP) {
            if (!settings?.waPhoneNumberId || !settings?.waAccessToken) {
              throw new Error('WhatsApp not configured for this restaurant');
            }
            if (!recipient.phone) {
              throw new Error('Customer has no phone number');
            }
            await this.sendWhatsapp(settings, recipient.phone, campaign, customerName, restaurantName);
          }

          success = true;
        } catch (err) {
          errorMsg = err.message;
          this.logger.warn(`Failed to send to recipient ${recipient.id}: ${errorMsg}`);
        }

        await this.prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: success ? RecipientDeliveryStatus.SENT : RecipientDeliveryStatus.FAILED,
            sentAt: success ? new Date() : null,
            errorMsg: errorMsg,
          },
        });

        if (success) {
          totalSent++;
          chSent[ch] = (chSent[ch] || 0) + 1;
          // For email/SMS/WhatsApp we treat SENT as DELIVERED (no webhook)
          totalDelivered++;
          chDelivered[ch] = (chDelivered[ch] || 0) + 1;
        } else {
          totalFailed++;
          chFailed[ch] = (chFailed[ch] || 0) + 1;
        }
      }

      // 8. Persist final analytics
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: CampaignStatus.COMPLETED,
          completedAt: new Date(),
          sentCount: totalSent,
          deliveredCount: totalDelivered,
          failedCount: totalFailed,
        },
      });

      for (const ch of selectedChannels) {
        await this.prisma.campaignChannelStat.update({
          where: { campaignId_channel: { campaignId, channel: ch } },
          data: {
            sentCount: chSent[ch] || 0,
            deliveredCount: chDelivered[ch] || 0,
            failedCount: chFailed[ch] || 0,
          },
        });
      }
    } catch (err) {
      this.logger.error(`Campaign ${campaignId} fatal error: ${err.message}`, err.stack);
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.CANCELLED },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Internal: Recipient Resolution (rule engine)
  // ═══════════════════════════════════════════════════════════════════════════

  private async resolveRecipients(
    restaurantId: string,
    rules: { condition: RuleConditionType; value: string | null }[],
    operator: RuleGroupOperator,
  ) {
    const allCustomers = await this.prisma.customer.findMany({
      where: { restaurantId, isActive: true },
    });

    // ALL_CUSTOMERS short-circuit
    const hasAllRule = rules.some((r) => r.condition === RuleConditionType.ALL_CUSTOMERS);
    if (rules.length === 0 || (hasAllRule && operator === RuleGroupOperator.AND)) {
      return allCustomers;
    }
    if (hasAllRule && operator === RuleGroupOperator.OR) {
      return allCustomers;
    }

    // Build per-customer order stats (keyed by phone)
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
      orderBy: { createdAt: 'desc' },
    });

    type Stats = {
      orderCount: number;
      totalSpend: number;
      lastOrderDate: Date | null;
      channels: Set<string>;
    };
    const phoneStats = new Map<string, Stats>();

    for (const s of sessions) {
      if (!s.customerPhone) continue;
      const curr = phoneStats.get(s.customerPhone) ?? {
        orderCount: 0,
        totalSpend: 0,
        lastOrderDate: null,
        channels: new Set<string>(),
      };
      curr.orderCount++;
      curr.totalSpend += Number(s.totalAmount ?? 0);
      if (!curr.lastOrderDate || s.createdAt > curr.lastOrderDate) {
        curr.lastOrderDate = s.createdAt;
      }
      curr.channels.add(s.channel);
      phoneStats.set(s.customerPhone, curr);
    }

    // Loyalty points per customer
    const loyaltyRows = await this.prisma.loyalityPointRedemption.findMany({
      where: { loyalityPoint: { restaurantId } },
      select: { customerId: true, pointsAwarded: true },
    });
    const loyaltyMap = new Map<string, number>();
    for (const r of loyaltyRows) {
      loyaltyMap.set(r.customerId, (loyaltyMap.get(r.customerId) ?? 0) + Number(r.pointsAwarded));
    }

    return allCustomers.filter((customer) => {
      const stats = phoneStats.get(customer.phone) ?? {
        orderCount: 0,
        totalSpend: 0,
        lastOrderDate: null as Date | null,
        channels: new Set<string>(),
      };
      const loyalty = loyaltyMap.get(customer.id) ?? 0;

      const ruleResults = rules.map((rule) => {
        const val = Number(rule.value ?? 0);
        switch (rule.condition) {
          case RuleConditionType.ALL_CUSTOMERS:
            return true;
          case RuleConditionType.MIN_ORDERS:
            return stats.orderCount >= val;
          case RuleConditionType.MAX_ORDERS:
            return stats.orderCount <= val;
          case RuleConditionType.MIN_SPEND:
            return stats.totalSpend >= val;
          case RuleConditionType.MAX_SPEND:
            return stats.totalSpend <= val;
          case RuleConditionType.LAST_ORDER_WITHIN_DAYS: {
            if (!stats.lastOrderDate) return false;
            const cutoff = new Date(Date.now() - val * 24 * 60 * 60 * 1000);
            return stats.lastOrderDate >= cutoff;
          }
          case RuleConditionType.ORDER_CHANNEL:
            return stats.channels.has(rule.value ?? '');
          case RuleConditionType.MIN_LOYALTY_POINTS:
            return loyalty >= val;
          default:
            return false;
        }
      });

      return operator === RuleGroupOperator.AND
        ? ruleResults.every(Boolean)
        : ruleResults.some(Boolean);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Internal: Channel Senders
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
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword,
      },
    });

    const subject = this.renderTemplate(
      campaign.subject ?? campaign.name,
      customerName,
      restaurantName,
      campaign.imageUrl,
    );

    // Auto-wrap HTML if not provided
    const htmlBody =
      campaign.htmlContent
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

  /** Builds a simple responsive default HTML email when no htmlContent is provided */
  private buildDefaultHtml(
    campaign: any,
    customerName: string,
    restaurantName: string,
  ): string {
    const text = campaign.textContent
      ? this.renderTemplate(campaign.textContent, customerName, restaurantName, campaign.imageUrl)
      : '';
    const img = campaign.imageUrl
      ? `<img src="${campaign.imageUrl}" alt="Promotion" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${campaign.subject ?? campaign.name}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;text-align:center;">
              <span style="color:#ffffff;font-size:22px;font-weight:700;">${restaurantName}</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${img}
              <h2 style="margin:0 0 12px;color:#1a1a2e;font-size:20px;">
                Hi ${customerName}!
              </h2>
              <p style="margin:0 0 24px;color:#444;font-size:15px;line-height:1.6;">${text}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:16px 32px;text-align:center;color:#999;font-size:12px;">
              &copy; ${new Date().getFullYear()} ${restaurantName}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
  //  Internal: Validation guards
  // ═══════════════════════════════════════════════════════════════════════════

  private async assertChannelSettings(
    restaurantId: string,
    channels: MarketingChannel[],
  ) {
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

    // RESTAURANT_ADMIN can manage; WAITER/CHEF/BILLER cannot access marketing
    if (
      mode === 'manage' &&
      actor.role !== UserRole.RESTAURANT_ADMIN
    ) {
      throw new ForbiddenException('Only OWNER, RESTAURANT_ADMIN and SUPER_ADMIN can manage marketing');
    }
  }
}
