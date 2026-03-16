import { ApiProperty } from '@nestjs/swagger';
import { BillStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateBillStatusDto {
    @ApiProperty({ enum: BillStatus })
    @IsEnum(BillStatus)
    status: BillStatus;
}