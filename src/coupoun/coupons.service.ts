import { BadRequestException, Injectable } from "@nestjs/common"
import { ValidateCouponDto } from "./dto/validate-coupoun.dto"
import { PrismaService } from "src/prisma/prisma.service"
import { CreateCouponDto } from "./dto/create-coupon.dto"
import { UpdateCouponDto } from "./dto/update-coupoun.dto"
import { CouponsValidationService } from "./coupons.validation.service"
import { CouponUsageRepository } from "./coupon-usage.repository"
import { paginate } from "src/common/utlility/pagination.util"
@Injectable()
export class CouponsService {

    constructor(
        private prisma: PrismaService,
        private validationService: CouponsValidationService,
        private usageRepo: CouponUsageRepository
    ) { }

    async create(restaurantId: string, dto: CreateCouponDto) {
        return this.prisma.coupon.create({
            data: {
                restaurantId,
                ...dto,
                validFrom: new Date(dto.validFrom),
                validUntil: new Date(dto.validUntil),
            },
        })
    }

    async findAll(
        restaurantId: string,
        page?: number,
        limit?: number,
        fetchAll?: boolean,
    ) {
        return paginate({
            prismaModel: this.prisma.coupon,
            page: page || 1,
            limit: limit || 10,
            fetchAll: fetchAll || false,
            where: {
                restaurantId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
    }

    async findOne(restaurantId: string, couponId: string) {
        return this.prisma.coupon.findFirst({
            where: { id: couponId, restaurantId }
        })
    }

    async update(couponId: string, dto: UpdateCouponDto) {

        return this.prisma.coupon.update({
            where: { id: couponId },
            data: dto
        })
    }

    async toggleStatus(couponId: string, isActive: boolean) {

        return this.prisma.coupon.update({
            where: { id: couponId },
            data: { isActive }
        })
    }

    async delete(couponId: string) {

        return this.prisma.coupon.delete({
            where: { id: couponId }
        })
    }

    async applyCoupon(
        restaurantId: string,
        orderSessionId: string,
        couponCode: string,
        orderAmount: number
    ) {
        const orderSession = await this.prisma.orderSession.findUnique({
            where: { id: orderSessionId }
        })

        if (!orderSession)
            throw new BadRequestException('Invalid order session')

        const { coupon, discount } =
            await this.validationService.validateCoupon(
                restaurantId,
                couponCode,
                orderAmount
            )

        await this.usageRepo.createUsage({
            couponId: coupon.id,
            orderSessionId,
            discountAmount: discount
        })

        return {
            discountAmount: discount
        }
    }

    async removeCoupon(orderSessionId: string) {

        await this.prisma.couponUsage.deleteMany({
            where: { orderSessionId }
        })
    }

    async getCouponUsages(couponId: string) {
        return this.usageRepo.findByCoupon(couponId);
    }

}