import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(
        private prisma: PrismaService,
        private stripeService: StripeService,
        private configService: ConfigService,
    ) { }

    private isWithinLoyaltyTimeWindow(
        currentMinutes: number,
        startTime?: string | null,
        endTime?: string | null,
    ): boolean {
        const start = this.parseTimeToMinutes(startTime);
        const end = this.parseTimeToMinutes(endTime);

        if (start === null && end === null) return true;
        if (start !== null && end === null) return currentMinutes >= start;
        if (start === null && end !== null) return currentMinutes <= end;

        if (start! <= end!) {
            return currentMinutes >= start! && currentMinutes <= end!;
        }

        return currentMinutes >= start! || currentMinutes <= end!;
    }

    private parseTimeToMinutes(time?: string | null): number | null {
        if (!time) return null;

        const [hh, mm] = time.split(':').map((v) => Number(v));
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

        return hh * 60 + mm;
    }

    async createBooking(
        actor: any,
        restaurantId: string,
        sessionId: string | undefined,
        dto: CreateBookingDto,
    ) {

        const successRedirectUrl =
            dto.successurl || this.configService.get<string>('BOOKING_PAYMENT_SUCCESS_URL');
        const failureRedirectUrl =
            dto.failureurl || this.configService.get<string>('BOOKING_PAYMENT_FAILURE_URL');

        if (!successRedirectUrl || !failureRedirectUrl) {
            throw new BadRequestException(
                'successurl and failureurl are required (or configure BOOKING_PAYMENT_SUCCESS_URL and BOOKING_PAYMENT_FAILURE_URL)',
            );
        }

        if (!actor && sessionId) {
            if (
                !dto.customerName ||
                !dto.customerPhone ||
                !dto.customerEmail ||
                !dto.deliveryAddress
            ) {
                throw new BadRequestException(
                    'Guest checkout requires customerName, customerPhone, customerEmail and deliveryAddress',
                );
            }
        }

        const customerId = actor?.id;
        const cartIdentity = customerId
            ? { customerId }
            : sessionId
                ? { guestId: sessionId }
                : null;

        if (!cartIdentity) {
            throw new NotFoundException('Cart not found');
        }

        const cart = await this.prisma.cart.findFirst({
            where: {
                restaurantId,
                ...cartIdentity,
            },
            include: {
                items: true,
            },
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        if (!cart.items || cart.items.length === 0) {
            throw new BadRequestException('Cart is empty');
        }

        const restaurant = await this.prisma.restaurant.findUnique({
            where: { id: restaurantId },
            select: { currency: true },
        });

        if (!restaurant) {
            throw new NotFoundException('Restaurant not found');
        }

        // ================================
        // STEP 1: CALCULATE SUBTOTAL
        // ================================

        let subtotal = 0;

        const items: {
            menuItemId: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
        }[] = [];

        for (const item of cart.items) {

            const menuItem = await this.prisma.menuItem.findUnique({
                where: { id: item.menuItemId },
            });

            if (!menuItem) {
                throw new NotFoundException(`Menu item ${item.menuItemId} not found`);
            }

            const unitPrice = Number(menuItem.price);
            const totalPrice = unitPrice * item.quantity;

            subtotal += totalPrice;

            items.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
            });
        }

        // ================================
        // STEP 2: COUPON LOGIC
        // ================================

        let discountAmount = 0;

        if (dto.couponName) {

            if (!actor) {
                throw new ForbiddenException('Coupons require authenticated user');
            }

            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    code: dto.couponName,
                    restaurantId,
                    isActive: true,
                },
            });

            if (!coupon) {
                throw new NotFoundException('Coupon not found');
            }

            const now = new Date();

            if (now < coupon.validFrom || now > coupon.validUntil) {
                throw new BadRequestException('Coupon expired or not yet active');
            }

            if (coupon.minOrderAmount && subtotal < Number(coupon.minOrderAmount)) {
                throw new BadRequestException(
                    `Minimum order amount ${coupon.minOrderAmount} required`,
                );
            }

            if (coupon.discountType === 'PERCENTAGE') {
                discountAmount = subtotal * (Number(coupon.discountValue) / 100);
            } else {
                discountAmount = Number(coupon.discountValue);
            }

            if (coupon.maxDiscount) {
                discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
            }
        }

        // ================================
        // STEP 3: LOYALTY POINTS
        // ================================

        let loyaltyDiscount = 0;

        if (dto.claimedLoyalityPoints) {

            if (!actor) {
                throw new ForbiddenException('Loyalty points require authenticated user');
            }

            const now = new Date();
            const loyaltyEligibleAmount = Math.max(0, subtotal - discountAmount);
            const redemptions = await this.prisma.loyalityPointRedemption.findMany({
                where: {
                    customerId: actor.id,
                    loyalityPoint: {
                        restaurantId,
                        isActive: true,
                        // Exclude loyalty points with endDate in the past
                        OR: [
                            { endDate: null }, // No end date (never expires)
                            { endDate: { gte: now } }, // End date is in the future
                        ],
                        AND: [
                            {
                                OR: [
                                    { conditionMinAmount: null },
                                    { conditionMinAmount: { lte: loyaltyEligibleAmount } },
                                ],
                            },
                            {
                                OR: [
                                    { conditionMaxAmount: null },
                                    { conditionMaxAmount: { gte: loyaltyEligibleAmount } },
                                ],
                            },
                        ],
                    } as any,
                },
            });

            if (redemptions.length === 0) {
                throw new BadRequestException('No valid loyalty points available');
            }

            for (const r of redemptions) {
                loyaltyDiscount += Number(r.pointsAwarded);
            }
        }

        // ================================
        // STEP 4: FINAL TOTAL
        // ================================

        const totalDiscount = discountAmount + loyaltyDiscount;
        const finalTotal = Math.max(subtotal - totalDiscount, 0);

        if (finalTotal <= 0) {
            throw new BadRequestException('Final payable amount must be greater than 0 for online Stripe checkout');
        }

        // ================================
        // LOYALTY EARNINGS PREVIEW (for authenticated users)
        // ================================
        let loyaltyWillEarn: any = null;
        try {
            if (actor) {
                const now = new Date();
                const billAmountDecimal = new Prisma.Decimal(finalTotal);
                const menuIds = Array.from(new Set(items.map((i) => i.menuItemId)));
                const fetched = await this.prisma.menuItem.findMany({
                    where: { id: { in: menuIds } },
                    select: { id: true, categoryId: true },
                });
                const categoryMap = new Map(fetched.map((m) => [m.id, m.categoryId]));

                const billItemsForCalc = items.map((it) => ({ menuItemId: it.menuItemId, menuItem: { categoryId: categoryMap.get(it.menuItemId) ?? null } }));

                const rules = await this.prisma.loyalityPoint.findMany({
                    where: {
                        restaurantId,
                        isActive: true,
                        AND: [
                            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
                            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
                            { OR: [{ conditionMinAmount: null }, { conditionMinAmount: { lte: billAmountDecimal } }] },
                            { OR: [{ conditionMaxAmount: null }, { conditionMaxAmount: { gte: billAmountDecimal } }] },
                        ],
                    },
                    include: { days: { select: { day: true } }, menuItem: true, categories: true },
                });

                const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                const breakdown: Array<any> = [];
                for (const rule of rules as any[]) {
                    if (rule.days.length > 0) {
                        const activeDays = new Set(rule.days.map((d) => d.day));
                        if (!activeDays.has(currentDay)) continue;
                    }

                    if (!this.isWithinLoyaltyTimeWindow(currentMinutes, rule.startTime, rule.endTime)) continue;

                    if (rule.menuItem) {
                        if (!menuIds.includes(rule.menuItem.id)) continue;
                    }

                    if (rule.categories.length > 0) {
                        const hasMatchingCategory = rule.categories.some((c: any) => billItemsForCalc.some((bi) => bi.menuItem.categoryId === c.id));
                        if (!hasMatchingCategory) continue;
                    }

                    if (rule.maxUsagePerCustomer !== null) {
                        const usageCount = await this.prisma.loyalityPointRedemption.count({ where: { loyalityPointId: rule.id, customerId: actor.id } });
                        if (usageCount >= rule.maxUsagePerCustomer) continue;
                    }

                    const ratio = rule.loyalityDiscountRatio ? Number(rule.loyalityDiscountRatio) : null;
                    const ruleMaxPoints = rule.points !== null && rule.points !== undefined ? Number(rule.points) : null;

                    let awarded = 0;
                    if (ratio !== null && !Number.isNaN(ratio)) {
                        awarded = Number(finalTotal) * ratio;
                        if (ruleMaxPoints !== null) awarded = Math.min(awarded, ruleMaxPoints);
                    } else if (ruleMaxPoints !== null) {
                        awarded = ruleMaxPoints;
                    }

                    awarded = parseFloat(awarded.toFixed(2));
                    if (awarded <= 0) continue;

                    breakdown.push({ loyalityPointId: rule.id, name: rule.name ?? null, pointsAwarded: awarded });
                }

                const totalPoints = breakdown.reduce((s, b) => s + b.pointsAwarded, 0);
                loyaltyWillEarn = { totalPoints, breakdown };
            }
        } catch (err) {
            this.logger.debug('Loyalty preview failed: ' + (err as any).message);
        }

        const customerEmail = dto.customerEmail || actor?.email;

        if (!customerEmail) {
            throw new BadRequestException('customerEmail is required to create Stripe checkout session');
        }

        const stripeCheckoutSession = await this.stripeService.createCheckoutLinkForBooking(
            { restaurantId, cartId: cart.id },
            {
                amount: finalTotal,
                currency: restaurant.currency,
                subtotal,
                discountAmount: totalDiscount,
                customerName: dto.customerName ?? actor?.name ?? null,
                customerPhone: dto.customerPhone ?? null,
                customerEmail,
                deliveryAddress: dto.deliveryAddress ?? null,
                specialInstructions: dto.notes ?? null,
            },
            customerEmail,
            successRedirectUrl,
            failureRedirectUrl,
        );

        return {
            subtotal,
            discountAmount: totalDiscount,
            totalAmount: finalTotal,
            loyaltyWillEarn: loyaltyWillEarn,
            paymentLink: stripeCheckoutSession.url,
            checkoutSessionId: stripeCheckoutSession.id,
            cartId: cart.id,
        };
    }
}