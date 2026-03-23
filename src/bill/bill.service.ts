import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';
import { BillStatus } from '@prisma/client';

@Injectable()
export class BillService {
    constructor(private prisma: PrismaService) { }

    async createBill(restaurantId: string, dto: CreateBillDto) {
        const menuItems = await this.prisma.menuItem.findMany({
            where: {
                id: { in: dto.items.map((i) => i.menuItemId) },
            },
        });

        if (menuItems.length !== dto.items.length) {
            throw new BadRequestException('Invalid menu items');
        }

        let subtotal = 0;

        const billItems = dto.items.map((item) => {
            const menu = menuItems.find((m) => m.id === item.menuItemId);

            if (!menu) {
                throw new BadRequestException(`Menu item with id ${item.menuItemId} not found`);
            }

            const totalPrice = Number(menu.price) * item.quantity;

            subtotal += totalPrice;

            return {
                menuItemId: menu.id,
                name: menu.name,
                quantity: item.quantity,
                unitPrice: menu.price,
                totalPrice,
            };
        });

        const taxAmount = subtotal * (Number(dto.taxRate) / 100);
        const discount = Number(dto.discountAmount || 0);

        const totalAmount = subtotal + taxAmount - discount;

        const billCount = await this.prisma.bill.count({
            where: { restaurantId },
        });

        const billNumber = (billCount + 1)
            .toString()
            .padStart(6, '0');

        return this.prisma.bill.create({
            data: {
                restaurantId,
                sessionId: dto.sessionId,
                billNumber,
                subtotal,
                grossAmount: subtotal,
                taxRate: dto.taxRate,
                taxAmount,
                discountAmount: discount,
                totalAmount,
                notes: dto.notes,
                items: {
                    create: billItems,
                },
            },
            include: {
                items: true,
            },
        });
    }

    async getRestaurantBills(restaurantId: string) {
        return this.prisma.bill.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                billNumber: true,
                status: true,
                totalAmount: true,
                createdAt: true,
            },
        });
    }

    async getBillDetail(id: string) {
        const bill = await this.prisma.bill.findUnique({
            where: { id },
            include: {
                items: true,
                payments: true,
                session: true,
            },
        });

        if (!bill) throw new NotFoundException('Bill not found');

        return bill;
    }

    async updateStatus(id: string, dto: UpdateBillStatusDto) {
        const bill = await this.prisma.bill.findUnique({
            where: { id },
        });

        if (!bill) throw new NotFoundException('Bill not found');

        return this.prisma.bill.update({
            where: { id },
            data: {
                status: dto.status,
                paidAt: dto.status === BillStatus.PAID ? new Date() : null,
            },
        });
    }

    async deleteBill(id: string) {
        const bill = await this.prisma.bill.findUnique({
            where: { id },
        });

        if (!bill) throw new NotFoundException('Bill not found');

        if (bill.status === BillStatus.PAID) {
            throw new BadRequestException('Cannot delete a paid bill');
        }

        return this.prisma.bill.delete({
            where: { id },
        });
    }
}