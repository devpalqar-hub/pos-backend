import {
    IsBoolean,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertUberEatsSettingsDto {
    @ApiProperty({
        example: 'uber_client_xxxxxxxxxxxxxxxx',
        description:
            'Uber Eats Developer Dashboard — OAuth Client ID',
    })
    @IsString()
    clientId: string;

    @ApiProperty({
        example: 'uber_secret_xxxxxxxxxxxxxxxx',
        description: 'Uber Eats Developer Dashboard — OAuth Client Secret',
    })
    @IsString()
    clientSecret: string;

    @ApiProperty({
        example: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        description:
            'Webhook shared secret — used to verify HMAC-SHA256 signature on incoming webhook payloads.',
    })
    @IsString()
    webhookSecret: string;

    @ApiPropertyOptional({
        example: '12345',
        description:
            'The Uber Eats Store / Restaurant ID. ' +
            'Found in the Uber Eats Merchant Dashboard under your store details.',
    })
    @IsOptional()
    @IsString()
    storeId?: string;

    @ApiPropertyOptional({
        default: true,
        description:
            'When true, incoming Uber Eats orders are automatically accepted. ' +
            'When false, you handle confirmation via the Uber Eats API separately.',
    })
    @IsOptional()
    @IsBoolean()
    autoAccept?: boolean;

    @ApiPropertyOptional({
        default: true,
        description:
            'When true, an OrderSession + OrderBatch is automatically created in POS when an Uber Eats ORDER_CREATED webhook arrives.',
    })
    @IsOptional()
    @IsBoolean()
    autoCreateOrders?: boolean;
}
