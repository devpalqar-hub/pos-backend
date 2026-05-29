import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluatePriceRule } from 'src/common/utlility/price-rule.helper';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) { }

    private parseBooleanQuery(value: unknown): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            return normalized === 'true' || normalized === '1' || normalized === 'yes';
        }
        return false;
    }

    private static readonly CART_ITEMS_INCLUDE = {
        items: {
            include: {
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        price: true,
                        discountedPrice: true,
                    },
                },
            },
        },
    } as const;

    private getGuestKey(query: any): string | undefined {
        return query.sessionId ?? query.guestId;
    }

    private async getEffectiveMenuItemPrice(menuItemId: string, restaurantId: string): Promise<number> {
        const menuItem = await this.prisma.menuItem.findFirst({
            where: {
                id: menuItemId,
                restaurantId,
                isActive: true,
            },
            select: {
                price: true,
                discountedPrice: true,
            },
        });

        if (!menuItem) {
            throw new NotFoundException(`Menu item ${menuItemId} not found`);
        }

        const priceRuleResult = await evaluatePriceRule(menuItemId, restaurantId);

        if (priceRuleResult.isApplicable && priceRuleResult.specialPrice != null) {
            return Number(priceRuleResult.specialPrice);
        }

        if (menuItem.discountedPrice != null) {
            return Number(menuItem.discountedPrice);
        }

        return Number(menuItem.price);
    }

    private async recalculateCartTotals(cartId: string): Promise<void> {
        const cart = await this.prisma.cart.findUnique({
            where: { id: cartId },
            include: { items: true },
        });

        if (!cart) {
            throw new NotFoundException('Cart not found');
        }

        const subtotal = cart.items.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0,
        );

        await this.prisma.cart.update({
            where: { id: cartId },
            data: {
                subtotal,
                total: subtotal,
            },
        });
    }

    async findCart(restaurantId: string, query: any) {
        const guestKey = this.getGuestKey(query);

        const identityWhere = query.customerId
            ? { customerId: query.customerId }
            : guestKey
                ? { guestId: guestKey }
                : undefined;

        if (!identityWhere) {
            throw new NotFoundException('Cart identity not provided');
        }

        return this.prisma.cart.findFirst({
            where: {
                restaurantId,
                ...identityWhere,
            },
            include: CartService.CART_ITEMS_INCLUDE,
        });
    }

    async getCart(restaurantId: string, query: any) {
        const cart = await this.findCart(restaurantId, query);
        if (!cart) return cart;

        const summary = await this.buildCartSummaryWithPayable(restaurantId, query, cart);

        // ── Applicable Loyalty Offers ─────────────────────────────────────────
        // Only resolve for logged-in customers (customerId present in query)
        let applicableLoyaltyOffers: any[] = [];
        if (query?.customerId) {
            try {
                const customer = await this.prisma.customer.findUnique({
                    where: { id: query.customerId },
                    select: { loyaltyWallet: true },
                });

                if (customer) {
                    const wallet = Number(customer.loyaltyWallet ?? 0);
                    const now = new Date();

                    const allOffers = await this.prisma.loyalityOffer.findMany({
                        where: {
                            restaurantId,
                            isActive: true,
                            AND: [
                                { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                                { OR: [{ validTo: null }, { validTo: { gte: now } }] },
                            ],
                        },
                        include: {
                            menuItems: { select: { id: true, name: true, price: true } },
                        },
                        orderBy: { pointsRequired: 'asc' },
                    });

                    applicableLoyaltyOffers = allOffers
                        .map((offer) => ({
                            id: offer.id,
                            name: offer.name,
                            type: offer.type,
                            pointsRequired: Number(offer.pointsRequired ?? 0),
                            redeemAmount: offer.redeemAmount !== null ? Number(offer.redeemAmount) : null,
                            validFrom: offer.validFrom ?? null,
                            validTo: offer.validTo ?? null,
                            menuItems: offer.menuItems,
                            customerCanRedeem: wallet >= Number(offer.pointsRequired ?? 0),
                            customerWallet: wallet,
                            pointsShortfall: Math.max(0, Number(offer.pointsRequired ?? 0) - wallet),
                        }))
                        .filter((offer) => offer.customerCanRedeem);
                }
            } catch {
                // Never break cart fetch on loyalty offer errors
            }
        }

        return {
            ...cart,
            payableAmoung: summary.payableAmoung,
            payableAmount: summary.payableAmount,
            summary,
            applicableLoyaltyOffers,
        };
    }


    async createCart(restaurantId: string, dto: any) {
        const guestKey = this.getGuestKey(dto);

        // ── No loyalty offer: simple cart creation ────────────────────────────
        if (!dto.loyaltyOfferId) {
            return this.prisma.cart.create({
                data: {
                    restaurantId,
                    customerId: dto.customerId,
                    guestId: guestKey,
                },
            });
        }

        // ── Loyalty offer redemption ──────────────────────────────────────────
        // Only logged-in customers can redeem loyalty offers
        if (!dto.customerId) {
            throw new BadRequestException('You must be logged in to redeem a loyalty offer');
        }

        // 1. Load and validate the offer
        const offer = await (this.prisma as any).loyalityOffer.findFirst({
            where: {
                id: dto.loyaltyOfferId,
                restaurantId,
                isActive: true,
            },
            include: {
                menuItems: { select: { id: true, name: true, price: true } },
            },
        });

        if (!offer) {
            throw new NotFoundException(
                `Loyalty offer ${dto.loyaltyOfferId} not found or inactive in this restaurant`,
            );
        }

        // 2. Check offer validity window
        const now = new Date();
        if (offer.validFrom && offer.validFrom > now) {
            throw new BadRequestException('This loyalty offer is not yet valid');
        }
        if (offer.validTo && offer.validTo < now) {
            throw new BadRequestException('This loyalty offer has expired');
        }

        // 3. Check customer has enough points
        const customer = await this.prisma.customer.findUnique({
            where: { id: dto.customerId },
            select: { loyaltyWallet: true },
        });

        if (!customer) {
            throw new NotFoundException('Customer not found');
        }

        const customerWallet = Number(customer.loyaltyWallet ?? 0);
        const pointsRequired = Number(offer.pointsRequired ?? 0);

        if (customerWallet < pointsRequired) {
            throw new BadRequestException(
                `Insufficient loyalty points. Required: ${pointsRequired}, Available: ${customerWallet}`,
            );
        }

        // 4. Execute atomically: create cart + apply offer + deduct points
        const result = await this.prisma.$transaction(async (tx) => {
            // Create the cart
            const cart = await tx.cart.create({
                data: {
                    restaurantId,
                    customerId: dto.customerId,
                    guestId: guestKey,
                },
            });

            // Deduct loyalty points from wallet
            await tx.customer.update({
                where: { id: dto.customerId },
                data: { loyaltyWallet: { decrement: pointsRequired } },
            });

            // FOOD offer: add the free menu item(s) to the cart at price 0
            if (offer.type === 'FOOD' && offer.menuItems?.length) {
                for (const menuItem of offer.menuItems) {
                    await tx.cartItem.create({
                        data: {
                            cartId: cart.id,
                            menuItemId: menuItem.id,
                            quantity: 1,
                            price: 0,   // Free item
                            total: 0,
                        },
                    });
                }
            }

            // AMOUNT offer: store redeemAmount as a discount on the cart
            if (offer.type === 'AMOUNT' && offer.redeemAmount) {
                await tx.cart.update({
                    where: { id: cart.id },
                    data: { discount: Number(offer.redeemAmount) },
                });
            }

            return cart;
        });

        // Return the fully loaded cart with items
        return this.prisma.cart.findUnique({
            where: { id: result.id },
            include: CartService.CART_ITEMS_INCLUDE,
        });
    }

    private async getOrCreateCart(restaurantId: string, query: any) {
        const existingCart = await this.findCart(restaurantId, query);
        if (existingCart) {
            return existingCart;
        }

        if (!query.customerId && !this.getGuestKey(query)) {
            throw new NotFoundException('Cart identity not provided');
        }

        await this.createCart(restaurantId, query);

        const createdCart = await this.findCart(restaurantId, query);
        if (!createdCart) {
            throw new NotFoundException('Cart not found');
        }

        return createdCart;
    }

    async addItem(restaurantId: string, query: any, dto: any) {
        const cart = await this.getOrCreateCart(restaurantId, query);

        const unitPrice = await this.getEffectiveMenuItemPrice(dto.menuItemId, restaurantId);
        const existingItem = cart.items.find((item) => item.menuItemId === dto.menuItemId);
        const nextQuantity = (existingItem?.quantity ?? 0) + dto.quantity;
        const nextTotal = unitPrice * nextQuantity;

        const item = await this.prisma.cartItem.upsert({
            where: {
                cartId_menuItemId: {
                    cartId: cart.id,
                    menuItemId: dto.menuItemId,
                },
            },
            update: {
                quantity: { increment: dto.quantity },
            },
            create: {
                cartId: cart.id,
                menuItemId: dto.menuItemId,
                quantity: dto.quantity,
                price: unitPrice,
                total: unitPrice * dto.quantity,
            },
        });

        await this.prisma.cartItem.update({
            where: { id: item.id },
            data: {
                price: unitPrice,
                total: nextTotal,
                quantity: nextQuantity,
            },
        });

        await this.recalculateCartTotals(cart.id);

        return this.prisma.cartItem.findUnique({
            where: { id: item.id },
            include: {
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        price: true,
                        discountedPrice: true,
                    },
                },
            },
        });
    }

    async updateItem(restaurantId: string, itemId: string, query: any, dto: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

        const item = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cartId: cart.id,
            },
            include: {
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        price: true,
                        discountedPrice: true,
                    },
                },
            },
        });

        if (!item) throw new NotFoundException('Cart item not found');

        try {
            if (dto.quantity === 0) {
                return await this.prisma.cartItem.delete({
                    where: { id: item.id },
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                                price: true,
                                discountedPrice: true,
                            },
                        },
                    },
                });
            }

            return await this.prisma.cartItem.update({
                where: { id: item.id },
                data: { quantity: dto.quantity },
                include: {
                    menuItem: {
                        select: {
                            id: true,
                            name: true,
                            imageUrl: true,
                            price: true,
                            discountedPrice: true,
                        },
                    },
                },
            });
        } catch (error: any) {
            if (error?.code === 'P2025') {
                throw new NotFoundException('Cart item not found');
            }

            throw error;
        }
    }

    async removeItem(restaurantId: string, itemId: string, query: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

        const item = await this.prisma.cartItem.findFirst({
            where: {
                id: itemId,
                cartId: cart.id,
            },
            include: {
                menuItem: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                        price: true,
                        discountedPrice: true,
                    },
                },
            },
        });

        if (!item) throw new NotFoundException('Cart item not found');

        try {
            return await this.prisma.cartItem.delete({
                where: { id: item.id },
                include: {
                    menuItem: {
                        select: {
                            id: true,
                            name: true,
                            imageUrl: true,
                            price: true,
                            discountedPrice: true,
                        },
                    },
                },
            });
        } catch (error: any) {
            if (error?.code === 'P2025') {
                throw new NotFoundException('Cart item not found');
            }

            throw error;
        }
    }

    async clearCart(restaurantId: string, query: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

        return this.prisma.cartItem.deleteMany({
            where: { cartId: cart.id },
        });
    }

    async mergeCart(restaurantId: string, dto: any) {
        const guestKey = this.getGuestKey(dto);

        return this.prisma.cart.updateMany({
            where: {
                restaurantId,
                guestId: guestKey,
            },
            data: {
                customerId: dto.customerId,
                guestId: null,
            },
        });
    }

    async validateCart(restaurantId: string, query: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

        return {
            valid: true,
            items: cart.items.length,
        };
    }

    async recalculateCart(restaurantId: string, query: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

        for (const item of cart.items) {
            const unitPrice = await this.getEffectiveMenuItemPrice(item.menuItemId, restaurantId);
            await this.prisma.cartItem.update({
                where: { id: item.id },
                data: {
                    price: unitPrice,
                    total: unitPrice * item.quantity,
                },
            });
        }

        const refreshedCart = await this.prisma.cart.findUnique({
            where: { id: cart.id },
            include: { items: true },
        });

        if (!refreshedCart) throw new NotFoundException('Cart not found');

        const subtotal = refreshedCart.items.reduce(
            (sum, item) => sum + Number(item.price) * item.quantity,
            0,
        );

        const total = subtotal;

        return this.prisma.cart.update({
            where: { id: cart.id },
            data: {
                subtotal,
                total,
            },
        });
    }

    async getSummary(restaurantId: string, query: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

        return this.buildCartSummaryWithPayable(restaurantId, query, cart);
    }

    private async buildCartSummaryWithPayable(restaurantId: string, query: any, cart: any) {
        const items = cart.items.length;
        const subtotal = Number(cart.subtotal ?? 0);
        const taxAmount = Number(cart.taxAmount ?? 0);
        const discount = Number(cart.discount ?? 0);
        const total = Number(cart.total ?? 0);

        const couponCode = query?.coupounName ?? query?.couponName;
        const shouldApplyLoyalty = this.parseBooleanQuery(query?.claimedLoyalityPoints);

        let couponDiscount = 0;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    code: couponCode,
                    restaurantId,
                    isActive: true,
                },
            });

            if (coupon) {
                const now = new Date();
                const isWithinValidity = now >= coupon.validFrom && now <= coupon.validUntil;
                const hasMinAmount = !coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount);

                if (isWithinValidity && hasMinAmount) {
                    if (coupon.discountType === 'PERCENTAGE') {
                        couponDiscount = subtotal * (Number(coupon.discountValue) / 100);
                    } else {
                        couponDiscount = Number(coupon.discountValue);
                    }

                    if (coupon.maxDiscount) {
                        couponDiscount = Math.min(couponDiscount, Number(coupon.maxDiscount));
                    }
                }
            }
        }

        let loyaltyDiscount = 0;
        if (shouldApplyLoyalty && query?.customerId) {
            const loyaltyEligibleAmount = Math.max(0, total - couponDiscount);
            const converter = await this.prisma.loyalityPointsConverter.findFirst({
                where: {
                    restaurantId,
                    isActive: true,
                },
            });

            if (converter) {
                const now = new Date();
                const redemptions = await this.prisma.loyalityPointRedemption.findMany({
                    where: {
                        customerId: query.customerId,
                        loyalityPoint: {
                            restaurantId,
                            isActive: true,
                            OR: [{ endDate: null }, { endDate: { gte: now } }],
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
                    select: {
                        pointsAwarded: true,
                    },
                });

                const totalPoints = redemptions.reduce(
                    (sum, redemption) => sum + Number(redemption.pointsAwarded),
                    0,
                );

                if (totalPoints > 0 && Number(converter.points) > 0) {
                    const conversionRate = Number(converter.value) / Number(converter.points);
                    const maxPossibleDiscount = totalPoints * conversionRate;
                    const maxAfterCoupon = Math.max(0, total - couponDiscount);
                    loyaltyDiscount = Math.min(maxPossibleDiscount, maxAfterCoupon);
                }
            }
        }

        const payableAmount = parseFloat(
            Math.max(0, total - couponDiscount - loyaltyDiscount).toFixed(2),
        );

        return {
            items,
            subtotal,
            taxAmount,
            discount,
            total,
            couponDiscount: parseFloat(couponDiscount.toFixed(2)),
            loyalityDiscount: parseFloat(loyaltyDiscount.toFixed(2)),
            payableAmoung: payableAmount,
            payableAmount,
        };
    }
}