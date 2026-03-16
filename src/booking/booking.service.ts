import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { CouponDiscountType, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersGateway } from '../orders/orders.gateway';
import { CreateBookingDto } from './dto/create-booking.dto';

import { OrderChannel } from '@prisma/client';

@Injectable()
export class BookingService {
    constructor(
        private prisma: PrismaService,
        private cartService: CartService,
        private gateway: OrdersGateway,
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
        guestId: string | undefined,
        dto: CreateBookingDto,
    ) {

        if (!actor && guestId) {
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

        const cart = await this.prisma.cart.findFirst({
            where: {
                id: dto.cartId,
                restaurantId,
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

            const redemptions = await this.prisma.loyalityPointRedemption.findMany({
                where: {
                    customerId: actor.id,
                    loyalityPoint: {
                        restaurantId,
                    },
                },
            });

            if (redemptions.length === 0) {
                throw new BadRequestException('No loyalty points available');
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

        // ================================
        // STEP 5: CREATE SESSION
        // ================================

        const sessionNumber = await this.generateSessionNumber(restaurantId);

        const session = await this.prisma.orderSession.create({
            data: {
                restaurantId,
                sessionNumber,
                channel: OrderChannel.ONLINE_OWN,
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
                status: 'PAID',

                subtotal,
                taxRate: 0,
                taxAmount: 0,
                discountAmount: totalDiscount,
                totalAmount: finalTotal,

                paidAt: new Date(),
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
                method: PaymentMethod.CASH,
            },
        });

        // ================================
        // STEP 9: WEBSOCKET EVENTS
        // ================================

        this.gateway.emitToBilling(restaurantId, 'bill:generated', bill);

        this.gateway.emitToBilling(restaurantId, 'payment:recorded', {
            billId: bill.id,
            amount: finalTotal,
            method: 'CASH',
        });

        this.gateway.emitToBilling(restaurantId, 'bill:paid', {
            billId: bill.id,
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
            payment,
        };
    }
}