import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal } from 'class-validator';

export class UpsertDeliveryChargeDto {
    @ApiProperty({
        description: 'Delivery charge amount for the restaurant',
        example: '40.00',
    })
    @IsDecimal({ decimal_digits: '0,2' })
    deliveryCharge!: string;
}
