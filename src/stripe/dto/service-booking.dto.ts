import { IsNumber, IsString, IsInt, Min } from 'class-validator';

export class ServiceBookingDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  currency: string;

  @IsInt()
  booking_id: number;
}
