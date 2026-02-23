import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OrderChannel {
  DINE_IN = 'DINE_IN',
  ONLINE_OWN = 'ONLINE_OWN',
  UBER_EATS = 'UBER_EATS',
}

export class CreateSessionDto {
  @ApiPropertyOptional({
    description: 'Table UUID (omit for online/delivery orders)',
    example: 'uuid-of-table',
  })
  @IsOptional()
  @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({
    enum: OrderChannel,
    default: OrderChannel.DINE_IN,
    description: 'Order channel — determines online/delivery field requirements',
  })
  @IsOptional()
  @IsEnum(OrderChannel)
  channel?: OrderChannel;

  // ── Walk-in customer info (optional) ──────────────────────────────────────
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ example: 2, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guestCount?: number;

  // ── Online / delivery fields ───────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'External platform order ID (e.g. Uber Eats order ref)',
    example: 'UBR-20250223-8A3C',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalOrderId?: string;

  @ApiPropertyOptional({ example: '123 Main St, Chennai, Tamil Nadu 600001' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ example: 'No onions on the burger. Ring bell twice.' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
