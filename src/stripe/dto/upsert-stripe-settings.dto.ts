import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpsertStripeSettingsDto {
    @ApiProperty({
        description: 'Stripe secret key for this restaurant (sk_live_... or sk_test_...)',
        example: 'sk_live_51...',
    })
    @IsString()
    @Length(10, 500)
    secretKey!: string;

    @ApiPropertyOptional({
        description: 'Stripe publishable key (pk_live_... or pk_test_...)',
        example: 'pk_live_51...',
    })
    @IsOptional()
    @IsString()
    @Length(10, 500)
    publishableKey?: string;

    @ApiPropertyOptional({
        description: 'Stripe webhook endpoint secret (whsec_...) from Stripe Dashboard → Webhooks',
        example: 'whsec_...',
    })
    @IsOptional()
    @IsString()
    @Length(10, 500)
    webhookSecret?: string;

    @ApiPropertyOptional({
        description: 'Default ISO 4217 currency code for checkout sessions (lowercase)',
        example: 'usd',
        default: 'usd',
    })
    @IsOptional()
    @IsString()
    @Length(2, 10)
    currency?: string;

    @ApiPropertyOptional({
        description: 'Whether Stripe integration is active for this restaurant',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
