import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDecimal,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    Min,
    ValidateNested,
} from 'class-validator';

export class CreateBillItemDto {
    @ApiProperty({
        description: 'Menu item UUID',
        example: '8f7c3a10-4c4a-4f68-b1b8-cc49c1f0a888',
    })
    @IsUUID()
    menuItemId: string;

    @ApiProperty({
        description: 'Snapshot name of menu item at billing time',
        example: 'Chicken Biryani',
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Quantity ordered',
        example: 2,
    })
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiProperty({
        description: 'Unit price of the item',
        example: 200,
    })
    @IsDecimal()
    unitPrice: number;
}

export class CreateBillDto {
    @ApiProperty({
        description: 'Order session ID associated with this bill',
        example: '4db01f5d-cc1a-4b3f-8c3f-72e5402ab122',
    })
    @IsUUID()
    sessionId: string;

    @ApiProperty({
        description: 'Restaurant UUID',
        example: 'a0fa1c0e-9c2b-4c7c-a26a-bc54ef1e9090',
    })
    @IsUUID()
    restaurantId: string;

    @ApiProperty({
        description: 'Subtotal before tax and discounts',
        example: 500,
    })
    @IsDecimal()
    subtotal: number;

    @ApiProperty({
        description: 'Tax percentage applied to the bill',
        example: 5,
    })
    @IsDecimal()
    taxRate: number;

    @ApiProperty({
        description: 'Total tax amount calculated',
        example: 25,
    })
    @IsDecimal()
    taxAmount: number;

    @ApiProperty({
        description: 'Total discount applied',
        example: 50,
        required: false,
    })
    @IsOptional()
    @IsDecimal()
    discountAmount?: number;

    @ApiProperty({
        description: 'Final payable amount',
        example: 475,
    })
    @IsDecimal()
    totalAmount: number;

    @ApiProperty({
        description: 'Optional notes for the bill',
        example: 'Customer requested less spice',
        required: false,
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({
        description: 'List of items included in the bill',
        type: [CreateBillItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateBillItemDto)
    items: CreateBillItemDto[];
}