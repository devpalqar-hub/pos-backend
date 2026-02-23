import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum OrderItemStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  PREPARED = 'PREPARED',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED',
}

export class UpdateItemStatusDto {
  @ApiProperty({
    enum: OrderItemStatus,
    description:
      'PREPARING and PREPARED are optional steps.\n' +
      'Chef: PENDING → PREPARING → PREPARED\n' +
      'Waiter: PREPARED → SERVED  (or PENDING → SERVED directly)\n' +
      'Either: any → CANCELLED',
  })
  @IsEnum(OrderItemStatus)
  status: OrderItemStatus;

  @ApiPropertyOptional({
    description: 'Required when status is CANCELLED',
    example: 'Customer changed mind',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancelReason?: string;
}
