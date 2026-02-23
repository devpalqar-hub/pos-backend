import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  ONLINE = 'ONLINE',
  OTHER = 'OTHER',
}

export class AddPaymentDto {
  @ApiProperty({ description: 'Payment amount', example: '450.00' })
  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Transaction reference (UPI UTR, card last 4 digits, etc.)',
    example: 'UTR20250223ABC123',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;

  @ApiPropertyOptional({ example: 'Split payment — party 1' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
