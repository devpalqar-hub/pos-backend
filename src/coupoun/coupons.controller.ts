import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common"
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger"
import { CouponsService } from "./coupons.service"
import { UserRole } from "@prisma/client"
import { Roles } from "src/common/decorators/roles.decorator"
import { CreateCouponDto } from "./dto/create-coupon.dto"
import { UpdateCouponDto } from "./dto/update-coupoun.dto"
import { ValidateCouponDto } from "./dto/validate-coupoun.dto"
import { ToggleCouponStatusDto } from "./dto/toggle-coupon-status.dto"

@ApiTags('Coupons')
@Controller('restaurants/:restaurantId')
export class CouponsController {

    constructor(
        private couponsService: CouponsService,
    ) { }

    @Post('coupons')
    @ApiOperation({ summary: 'Create coupon' })
    @ApiParam({ name: 'restaurantId' })
    create(
        @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
        @Body() dto: CreateCouponDto
    ) {
        return this.couponsService.create(restaurantId, dto)
    }

    @Get('coupons')
    @ApiOperation({ summary: 'List coupons' })
    findAll(@Param('restaurantId') restaurantId: string) {
        return this.couponsService.findAll(restaurantId)
    }

    @Get('coupons/:couponId')
    @ApiOperation({ summary: 'Get single coupon' })
    findOne(
        @Param('restaurantId') restaurantId: string,
        @Param('couponId') couponId: string
    ) {
        return this.couponsService.findOne(restaurantId, couponId)
    }

    @Patch('coupons/:couponId')
    @ApiOperation({ summary: 'Update coupon' })
    update(
        @Param('couponId') couponId: string,
        @Body() dto: UpdateCouponDto
    ) {
        return this.couponsService.update(couponId, dto)
    }

    @Patch('coupons/:couponId/status')
    @ApiOperation({ summary: 'Activate / deactivate coupon' })
    toggleStatus(
        @Param('couponId') couponId: string,
        @Body() dto: ToggleCouponStatusDto
    ) {
        return this.couponsService.toggleStatus(couponId, dto.isActive)
    }

    @Delete('coupons/:couponId')
    @ApiOperation({ summary: 'Delete coupon' })
    remove(@Param('couponId') couponId: string) {
        return this.couponsService.delete(couponId)
    }

    @Post('coupons/validate')
    @ApiOperation({ summary: 'Validate coupon' })
    validate(
        @Param('restaurantId') restaurantId: string,
        @Body() dto: ValidateCouponDto
    ) {
        return this.couponsService.applyCoupon(
            restaurantId,
            '',
            dto.couponCode,
            dto.orderAmount
        )
    }

    @Post('orders/:orderSessionId/apply-coupon')
    @ApiOperation({ summary: 'Apply coupon to order' })
    applyCoupon(
        @Param('restaurantId') restaurantId: string,
        @Param('orderSessionId') orderSessionId: string,
        @Body() dto: ValidateCouponDto
    ) {
        return this.couponsService.applyCoupon(
            restaurantId,
            orderSessionId,
            dto.couponCode,
            dto.orderAmount
        )
    }

    @Delete('orders/:orderSessionId/coupon')
    @ApiOperation({ summary: 'Remove coupon from order' })
    removeCoupon(
        @Param('orderSessionId') orderSessionId: string
    ) {
        return this.couponsService.removeCoupon(orderSessionId)
    }

    @Get('coupons/:couponId/usages')
    @ApiOperation({ summary: 'Coupon usages' })
    getUsage(@Param('couponId') couponId: string) {
        return this.couponsService.getCouponUsages(couponId)
    }

}