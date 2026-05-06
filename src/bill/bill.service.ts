import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';
import { BillStatus, Prisma } from '@prisma/client';

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
            include: {
                customer: { select: { id: true } },
                items: {
                    select: {
                        menuItemId: true,
                        menuItem: {
                            select: { categoryId: true },
                        },
                    },
                },
            },
        });

        if (!bill) throw new NotFoundException('Bill not found');

        const shouldAwardLoyalty = bill.status !== BillStatus.PAID && dto.status === BillStatus.PAID;

        return this.prisma.$transaction(async (tx) => {
            const updatedBill = await tx.bill.update({
                where: { id },
                data: {
                    status: dto.status,
                    paidAt: dto.status === BillStatus.PAID ? new Date() : null,
                },
            });

            if (shouldAwardLoyalty && bill.customerId) {
                await this.awardLoyaltyPointsForPaidBill(
                    tx,
                    bill.restaurantId,
                    bill.id,
                    bill.customerId,
                    Number(bill.totalAmount),
                    bill.items,
                );
            }

            return updatedBill;
        });
    }

    private async awardLoyaltyPointsForPaidBill(
        tx: Prisma.TransactionClient,
        restaurantId: string,
        billId: string,
        customerId: string,
        billAmount: number,
        billItems: Array<{
            menuItemId: string;
            menuItem: { categoryId: string | null } | null;
        }>,
    ): Promise<void> {
        if (billAmount <= 0) return;

        const now = new Date();
        const currentDay = now
            .toLocaleDateString('en-US', { weekday: 'long' })
            .toUpperCase() as any;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const billMenuItemIds = new Set(billItems.map((item) => item.menuItemId));
        const billCategoryIds = new Set(
            billItems
                .map((item) => item.menuItem?.categoryId)
                .filter((categoryId): categoryId is string => Boolean(categoryId)),
        );

        const billAmountDecimal = new Prisma.Decimal(billAmount);
        const rules = await tx.loyalityPoint.findMany({
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
            include: {
                days: { select: { day: true } },
                menuItem: { select: { id: true } },
                categories: { select: { id: true } },
            },
        });

        const awards: {
            loyalityPointId: string;
            customerId: string;
            pointsAwarded: Prisma.Decimal;
        }[] = [];

        for (const rule of rules as any[]) {
            if (rule.days.length > 0) {
                const activeDays = new Set(rule.days.map((d) => d.day));
                if (!activeDays.has(currentDay)) continue;
            }

            if (!this.isWithinLoyaltyTimeWindow(currentMinutes, rule.startTime, rule.endTime)) {
                continue;
            }

            if (rule.menuItem && !billMenuItemIds.has(rule.menuItem.id)) {
                continue;
            }

            if (rule.categories.length > 0) {
                const hasMatchingCategory = rule.categories.some((c) => billCategoryIds.has(c.id));
                if (!hasMatchingCategory) continue;
            }

            if (rule.maxUsagePerCustomer !== null) {
                const usageCount = await tx.loyalityPointRedemption.count({
                    where: {
                        loyalityPointId: rule.id,
                        customerId,
                    },
                });
                if (usageCount >= rule.maxUsagePerCustomer) continue;
            }

            const points = Number(rule.points ?? 0);
            if (points <= 0) continue;

            awards.push({
                loyalityPointId: rule.id,
                customerId,
                pointsAwarded: new Prisma.Decimal(points.toFixed(2)),
            });
        }

        if (awards.length === 0) return;

        await tx.loyalityPointRedemption.createMany({ data: awards });

        const totalPointsAwarded = awards.reduce((sum, award) => sum + Number(award.pointsAwarded), 0);
        await tx.customer.update({
            where: { id: customerId },
            data: {
                loyaltyWallet: {
                    increment: new Prisma.Decimal(totalPointsAwarded),
                },
            },
        });
    }

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