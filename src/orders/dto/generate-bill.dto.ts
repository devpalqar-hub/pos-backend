import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString } from 'class-validator';

export class GenerateBillDto {
  @ApiPropertyOptional({
    description: 'Discount amount to apply on the subtotal',
    example: '50.00',
  })
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  discountAmount?: string;

  @ApiPropertyOptional({ example: 'Staff discount applied' })
  @IsOptional()
  @IsString()
  notes?: string;
}
