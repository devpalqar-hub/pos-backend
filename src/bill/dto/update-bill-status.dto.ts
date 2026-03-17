import { ApiProperty } from '@nestjs/swagger';
import { BillStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateBillStatusDto {
    @ApiProperty({
        description: 'New status of the bill',
        enum: BillStatus,
        example: BillStatus.PAID,
    })
    @IsEnum(BillStatus)
    status: BillStatus;
}