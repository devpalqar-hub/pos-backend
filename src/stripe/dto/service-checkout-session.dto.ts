import { IsNumber, IsString, IsInt, Min, IsUrl } from 'class-validator';

export class ServiceCheckoutSessionDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  currency: string;

  @IsInt()
  booking_id: number;

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;
}
