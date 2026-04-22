import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { evaluatePriceRule } from 'src/common/utlility/price-rule.helper';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) { }

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
        return this.findCart(restaurantId, query);
    }

    async createCart(restaurantId: string, dto: any) {
        const guestKey = this.getGuestKey(dto);
        return this.prisma.cart.create({
            data: {
                restaurantId,
                customerId: dto.customerId,
                guestId: guestKey,
            },
        });
    }

    async addItem(restaurantId: string, query: any, dto: any) {
        if (this.getGuestKey(query) && !query.customerId) {
            const cart = await this.findCart(restaurantId, query);
            if (!cart) {
                await this.createCart(restaurantId, query);
            }
        }
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

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

    async updateItem(itemId: string, dto: any) {
        if (dto.quantity === 0) {
            return this.prisma.cartItem.delete({
                where: { id: itemId },
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

        return this.prisma.cartItem.update({
            where: { id: itemId },
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
    }

    async removeItem(itemId: string) {
        return this.prisma.cartItem.delete({
            where: { id: itemId },
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

        const items = cart.items.length;

        return {
            items,
            subtotal: cart.subtotal,
            taxAmount: cart.taxAmount,
            discount: cart.discount,
            total: cart.total,
        };
    }
}