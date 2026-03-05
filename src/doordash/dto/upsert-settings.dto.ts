import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertDoorDashSettingsDto {
  @ApiProperty({
    example: 'a1b2c3d4-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    description:
      'DoorDash Developer Portal — Developer ID (found in API keys section)',
  })
  @IsString()
  developerId: string;

  @ApiProperty({
    example: 'key_xxxxxxxxxxxxxxxxxxxxxxxx',
    description: 'DoorDash Developer Portal — API Key ID',
  })
  @IsString()
  keyId: string;

  @ApiProperty({
    example: 'signing_secret_xxxxxxxxxxxxxxxxxxxxxxxx',
    description: 'DoorDash Developer Portal — API Signing Secret',
  })
  @IsString()
  signingSecret: string;

  @ApiProperty({
    example: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    description:
      'Webhook shared secret — generated when you register the webhook endpoint in the DoorDash portal. ' +
      'Used to verify the HMAC-SHA256 signature on incoming webhook payloads.',
  })
  @IsString()
  webhookSecret: string;

  @ApiPropertyOptional({
    example: '12345',
    description:
      'The DoorDash Store / Business ID for this restaurant. ' +
      'Found in the DoorDash Merchant Portal under your store details.',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    default: true,
    description:
      'When true, incoming DoorDash orders are automatically accepted. ' +
      'When false, you handle confirmation via the DoorDash API separately.',
  })
  @IsOptional()
  @IsBoolean()
  autoAccept?: boolean;

  @ApiPropertyOptional({
    default: true,
    description:
      'When true, an OrderSession + OrderBatch is automatically created in POS when a DoorDash ORDER_CREATED webhook arrives.',
  })
  @IsOptional()
  @IsBoolean()
  autoCreateOrders?: boolean;
}
