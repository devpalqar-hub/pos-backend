import { Module } from "@nestjs/common";
import { CouponsController } from "./coupons.controller";
import { CouponsService } from "./coupons.service";
import { PrismaService } from "src/prisma/prisma.service";
import { CouponsValidationService } from "./coupons.validation.service";
import { CouponUsageRepository } from "./coupon-usage.repository";

@Module({
    controllers: [CouponsController],
    providers: [
        CouponsService,
        CouponsValidationService,
        CouponUsageRepository,
        PrismaService
    ]
})
export class CouponsModule { }