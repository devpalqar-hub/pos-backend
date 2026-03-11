import { Injectable } from "@nestjs/common"
import { PrismaService } from "src/prisma/prisma.service"

@Injectable()
export class CouponUsageRepository {

    constructor(private prisma: PrismaService) { }

    async createUsage(data: {
        couponId: string
        orderSessionId: string
        discountAmount: number
    }) {

        return this.prisma.couponUsage.create({
            data
        })
    }

    async findByCoupon(couponId: string) {
        return this.prisma.couponUsage.findMany({
            where: { couponId },
            orderBy: { createdAt: 'desc' }
        })
    }

}