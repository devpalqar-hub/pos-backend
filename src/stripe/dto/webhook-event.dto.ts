import { IsString, IsObject, IsOptional, IsNumber } from 'class-validator';

export class WebhookEventDto {
  @IsString()
  id: string;

  @IsString()
  object: string;

  @IsString()
  type: string;

  @IsNumber()
  created: number;

  @IsObject()
  data: {
    object: any;
    previous_attributes?: any;
  };

  @IsOptional()
  @IsString()
  livemode?: boolean;

  @IsOptional()
  @IsNumber()
  pending_webhooks?: number;

  @IsOptional()
  @IsObject()
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface PaymentIntentMetadata {
  order_id?: string;
  orderNumber?: string;
  user_email?: string;
  service_id?: string;
  booking_id?: string;
  product_id?: string;
  product_name?: string;
  price?: string;
  cartId?: string;
  description?: string;
  slug?: string; //
}

export interface CheckoutSessionMetadata {
  order_id?: string;
  orderNumber?: string;
  user_email?: string;
  user_id?: string;
  service_id?: string;
  booking_id?: string;
  booking_ids?: string;
  product_id?: string;
  product_name?: string;
  price?: string;
  cartId?: string;
  description?: string;
}

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  orderId?: string;
  bookingId?: string;
  error?: string;
  redirectTo?: string; // Add redirect destination indicator
}
