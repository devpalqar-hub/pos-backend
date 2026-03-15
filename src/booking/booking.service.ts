import {
    BadRequestException,
    Injectable,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { CouponDiscountType } from '@prisma/client';
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

    async createBooking(
        actor: any,
        restaurantId: string,
        guestId: string | undefined,
        dto: CreateBookingDto,
    ) {

        /*
        Guest validation
        If request comes without auth token but guestId is provided,
        require customer details
        */

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


        // -----------------------------------------Get Cart Total-----------------------------------------
        let subtotal = 0;

        for (const item of cart.items) {
            subtotal += Number(item.price) * item.quantity;
        }

        let discountAmount = 0;
        // ------------------------------------------------------------------------------------

        // -----------------------------------------Coupon Validation-----------------------------------------
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

            /*
            Global usage limit
            */

            if (coupon.usageLimit) {
                const usageCount = await this.prisma.couponUsage.count({
                    where: { couponId: coupon.id },
                });

                if (usageCount >= coupon.usageLimit) {
                    throw new BadRequestException('Coupon usage limit reached');
                }
            }

            /*
            Per customer limit
            */

            if (coupon.perCustomerLimit && actor?.id) {
                const usageCount = await this.prisma.couponUsage.count({
                    where: {
                        couponId: coupon.id,
                        customerId: actor.id,
                    },
                });

                if (usageCount >= coupon.perCustomerLimit) {
                    throw new BadRequestException('Coupon already used maximum times');
                }
            }

            /*
            Calculate discount
            */

            if (coupon.discountType === 'PERCENTAGE') {
                discountAmount = subtotal * (Number(coupon.discountValue) / 100);
            } else {
                discountAmount = Number(coupon.discountValue);
            }

            if (coupon.maxDiscount) {
                discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
            }
        }

        // ----------------------------------------------------------------------------------------------

        // ------------------------------------Loyalty Points Logic---------------------------------

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
                include: {
                    loyalityPoint: true,
                },
            });

            if (redemptions.length === 0) {
                throw new BadRequestException('No loyalty points available');
            }

            for (const r of redemptions) {
                loyaltyDiscount += Number(r.pointsAwarded);
            }
        }
        // ----------------------------------------------------------------------------------------------

        // ------------------------------------Calculate Final Amount----------------------------------------------------------

        const totalDiscount = discountAmount + loyaltyDiscount;

        const finalTotal = Math.max(subtotal - totalDiscount, 0);

        // ----------------------------------------------------------------------------------------------



        const sessionNumber = await this.generateSessionNumber(restaurantId);

        const session = await this.prisma.orderSession.create({
            data: {
                restaurantId,
                sessionNumber,
                channel: OrderChannel.ONLINE_OWN,
                openedById: actor?.id ?? cart.customerId,

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


        // ------------------------------------Record Coupon Usage----------------------------------------------------------

        if (dto.couponName && actor) {

            const coupon = await this.prisma.coupon.findUnique({
                where: { code: dto.couponName },
            });

            if (!coupon) {
                throw new NotFoundException('Coupon not found');
            }

            await this.prisma.couponUsage.create({
                data: {
                    couponId: coupon.id,
                    orderSessionId: session.id,
                    customerId: actor.id,
                    discountAmount,
                },
            });
        }
        // ----------------------------------------------------------------------------------------------

        // ------------------------------------Record Loyalty Redemption----------------------------------------------------------
        if (dto.claimedLoyalityPoints && actor) {

            const points = await this.prisma.loyalityPointRedemption.findMany({
                where: {
                    customerId: actor.id,
                    loyalityPoint: {
                        restaurantId,
                    },
                },
            });

            for (const p of points) {
                await this.prisma.loyalityPointRedemption.update({
                    where: { id: p.id },
                    data: {
                        redeemedAt: new Date(),
                    },
                });
            }
        }



        const batchNumber = await this.generateBatchNumber(session.id);

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

            items.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                unitPrice,
                totalPrice,
            });
        }

        const batch = await this.prisma.orderBatch.create({
            data: {
                sessionId: session.id,
                batchNumber,
                createdById: actor?.id ?? cart.customerId,
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
                session: true,
            },
        });

        /*
        Websocket events
        */

        this.gateway.emitToKitchen(restaurantId, 'batch:created', batch);
        this.gateway.emitToBilling(restaurantId, 'batch:created', batch);

        /*
        Payment gateway integration placeholder
        */

        // TODO:
        // integrate Stripe / Razorpay here
        // after successful payment mark session confirmed

        /*
        Clear cart after booking
        */

        await this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });

        return {
            session,
            batch,
        };
    }
}