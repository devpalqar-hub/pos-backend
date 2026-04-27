import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillStatus, CouponDiscountType, OrderChannel, PaymentMethod, PaymentStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreateBookingDto } from './dto/create-booking.dto';
import { DoorDashService } from '../doordash/doordash.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(
        private prisma: PrismaService,
        private cartService: CartService,
        private gateway: OrdersGateway,
        private doorDashService: DoorDashService,
        private stripeService: StripeService,
        private configService: ConfigService,
    ) { }

    private async generateSessionNumber(restaurantId: string) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const exists = await this.prisma.orderSession.findFirst({
            where: {
                restaurantId,
                sessionNumber: code,
            },
        });

        if (exists) {
            return this.generateSessionNumber(restaurantId);
        }

        return code;
    }

    private async generateBatchNumber(sessionId: string) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const exists = await this.prisma.orderBatch.findFirst({
            where: {
                sessionId,
                batchNumber: code,
            },
        });

        if (exists) {
            return this.generateBatchNumber(sessionId);
        }

        return code;
    }

    private async generateBillNumber(restaurantId: string) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const exists = await this.prisma.bill.findFirst({
            where: {
                restaurantId,
                billNumber: code,
            },
        });

        if (exists) {
            return this.generateBillNumber(restaurantId);
        }

        return code;
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
                    },
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
        // STEP 5: CREATE SESSION
        // ================================

        const sessionNumber = await this.generateSessionNumber(restaurantId);

        const session = await this.prisma.orderSession.create({
            data: {
                restaurantId,
                sessionNumber,
                channel: OrderChannel.ONLINE_OWN,
                status: SessionStatus.BILLED,
                customerId: actor?.id ?? cart.customerId,

                subtotal,
                discountAmount: totalDiscount,
                totalAmount: finalTotal,

                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                customerEmail: dto.customerEmail,
                deliveryAddress: dto.deliveryAddress,
                specialInstructions: dto.notes,
            },
        });

        // ================================
        // STEP 6: CREATE BATCH
        // ================================

        const batchNumber = await this.generateBatchNumber(session.id);

        const batch = await this.prisma.orderBatch.create({
            data: {
                sessionId: session.id,
                batchNumber,
                customerId: actor?.id ?? cart.customerId,
                items: {
                    create: items,
                },
            },
            include: {
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
            },
        });

        // ================================
        // STEP 7: CREATE BILL
        // ================================

        const billNumber = await this.generateBillNumber(restaurantId);

        const bill = await this.prisma.bill.create({
            data: {
                sessionId: session.id,
                restaurantId,
                billNumber,
                status: BillStatus.FINAL,

                subtotal,
                taxRate: 0,
                taxAmount: 0,
                grossAmount: subtotal,
                discountAmount: totalDiscount,
                totalAmount: finalTotal,
            },
        });

        await this.prisma.billItem.createMany({
            data: items.map((item) => ({
                billId: bill.id,
                menuItemId: item.menuItemId,
                name: batch.items.find(i => i.menuItemId === item.menuItemId)?.menuItem.name ?? '',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
            })),
        });

        // ================================
        // STEP 8: CREATE PAYMENT
        // ================================

        const payment = await this.prisma.payment.create({
            data: {
                billId: bill.id,
                amount: finalTotal,
                method: PaymentMethod.ONLINE,
                status: PaymentStatus.PENDING,
                notes: 'PENDING_STRIPE_CHECKOUT',
            },
        });

        const customerEmail = dto.customerEmail || actor?.email;

        if (!customerEmail) {
            throw new BadRequestException('customerEmail is required to create Stripe checkout session');
        }

        const stripeCheckoutSession = await this.stripeService.createCheckoutLinkForBooking(
            { id: session.id, restaurantId },
            { id: payment.id, billId: bill.id, amount: finalTotal, currency: restaurant.currency },
            customerEmail,
            successRedirectUrl,
            failureRedirectUrl,
        );

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                reference: stripeCheckoutSession.id,
                notes: 'PENDING_STRIPE_CHECKOUT',
            },
        });

        // ================================
        // STEP 8.5: CREATE DOORDASH DRIVE DELIVERY
        // ================================

        // let delivery: {
        //     provider: 'DOORDASH_DRIVE';
        //     externalDeliveryId: string;
        //     deliveryStatus: string | null;
        //     trackingUrl: string | null;
        // } | null = null;

        // try {
        //     const driveDelivery = await this.doorDashService.createDriveDeliveryForSession(
        //         restaurantId,
        //         session.id,
        //     );

        //     delivery = {
        //         provider: 'DOORDASH_DRIVE',
        //         externalDeliveryId: driveDelivery.externalDeliveryId,
        //         deliveryStatus: driveDelivery.deliveryStatus,
        //         trackingUrl: driveDelivery.trackingUrl,
        //     };
        // } catch (err: unknown) {
        //     const error = err instanceof Error ? err : new Error(String(err));
        //     this.logger.warn(
        //         `DoorDash delivery creation skipped for session ${session.id}: ${error.message}`,
        //     );
        // }

        // ================================
        // STEP 9: WEBSOCKET EVENTS
        // ================================

        this.gateway.emitToBilling(restaurantId, 'bill:generated', bill);

        this.gateway.emitToBilling(restaurantId, 'payment:pending', {
            billId: bill.id,
            amount: finalTotal,
            method: 'ONLINE',
            checkoutSessionId: stripeCheckoutSession.id,
        });

        // ================================
        // STEP 10: CLEAR CART
        // ================================

        await this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        return {
            session,
            batch,
            bill,
            payment: {
                ...payment,
                reference: stripeCheckoutSession.id,
            },
            paymentLink: stripeCheckoutSession.url,
            checkoutSessionId: stripeCheckoutSession.id,
            // delivery, -- commented this
        };
    }
}