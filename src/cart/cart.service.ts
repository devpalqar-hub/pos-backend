import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
    constructor(private prisma: PrismaService) { }

    async findCart(restaurantId: string, query: any) {
        return this.prisma.cart.findFirst({
            where: {
                restaurantId,
                OR: [
                    { customerId: query.customerId },
                    { guestId: query.guestId },
                ],
            },
            include: { items: true },
        });
    }

    async getCart(restaurantId: string, query: any) {
        return this.findCart(restaurantId, query);
    }

    async createCart(restaurantId: string, dto: any) {
        return this.prisma.cart.create({
            data: {
                restaurantId,
                customerId: dto.customerId,
                guestId: dto.guestId,
            },
        });
    }

    async addItem(restaurantId: string, query: any, dto: any) {
        const cart = await this.findCart(restaurantId, query);

        if (!cart) throw new NotFoundException('Cart not found');

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
                price: 0,
                total: 0,
            },
        });

        return item;
    }

    async updateItem(itemId: string, dto: any) {
        if (dto.quantity === 0) {
            return this.prisma.cartItem.delete({
                where: { id: itemId },
            });
        }

        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: dto.quantity },
        });
    }

    async removeItem(itemId: string) {
        return this.prisma.cartItem.delete({
            where: { id: itemId },
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
        return this.prisma.cart.updateMany({
            where: {
                restaurantId,
                guestId: dto.guestId,
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

        let subtotal = 0;

        cart.items.forEach((i) => {
            subtotal += Number(i.price) * i.quantity;
        });

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