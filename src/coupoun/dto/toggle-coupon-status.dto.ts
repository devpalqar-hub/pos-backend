import { ApiProperty } from '@nestjs/swagger'

export class ToggleCouponStatusDto {

    @ApiProperty()
    isActive: boolean
}