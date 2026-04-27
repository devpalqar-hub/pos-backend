import {
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
  IsUrl,
} from 'class-validator';

export class CheckoutSessionDto {
  @IsOptional()
  @IsInt()
  shippingaddressId: number;

  @IsInt()
  billingaddressId: number;

  @IsOptional()
  @IsInt()
  church_id: number;

  @IsString()
  memoryProfileId: string;

  @IsString()
  currency: string;

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;
}
