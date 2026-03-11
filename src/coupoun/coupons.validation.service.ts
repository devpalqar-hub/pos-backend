import { BadRequestException, Injectable } from "@nestjs/common"
import { PrismaService } from "src/prisma/prisma.service"

@Injectable()
export class CouponsValidationService {

    constructor(private prisma: PrismaService) { }

    async validateCoupon(
        restaurantId: string,
        couponCode: string,
        orderAmount: number
    ) {

        const coupon = await this.prisma.coupon.findFirst({
            where: {
                restaurantId,
                code: couponCode,
                isActive: true
            }
        })

        if (!coupon)
            throw new BadRequestException('Invalid coupon')

        const now = new Date()

        if (now < coupon.validFrom || now > coupon.validUntil)
            throw new BadRequestException('Coupon expired')

        if (coupon.minOrderAmount && orderAmount < Number(coupon.minOrderAmount))
            throw new BadRequestException('Minimum order not met')

        let discount = 0

        if (coupon.discountType === 'PERCENTAGE') {

            discount = orderAmount * Number(coupon.discountValue) / 100

            if (coupon.maxDiscount)
                discount = Math.min(discount, Number(coupon.maxDiscount))

        } else {
            discount = Number(coupon.discountValue)
        }

        return { coupon, discount }
    }

}