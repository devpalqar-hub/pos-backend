import { IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CheckoutDto {
  @IsOptional()
  @IsInt()
  shippingaddressId: number;

  @IsOptional()
  @IsInt()
  billingaddressId: number;

  @IsOptional()
  @IsInt()
  church_id: number;

  @IsString()
  currency: string;

  @IsString()
  memoryProfileId: string;
}
