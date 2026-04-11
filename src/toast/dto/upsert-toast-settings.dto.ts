import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class UpsertToastSettingsDto {
    @ApiProperty({
        example: 'my-toast-client-id',
        description: 'Toast API clientId from the Toast developer portal / support.',
    })
    @IsString()
    clientId!: string;

    @ApiProperty({
        example: 'my-toast-client-secret',
        description: 'Toast API clientSecret for the above clientId.',
    })
    @IsString()
    clientSecret!: string;

    @ApiProperty({
        example: '4721e7a9-b4ae-4fef-9230-b3dae186e0a4',
        description: 'Toast restaurant external GUID sent in the Toast-Restaurant-External-ID header.',
    })
    @IsString()
    toastRestaurantExternalId!: string;

    @ApiPropertyOptional({
        example: 'https://ws-api.toasttab.com',
        description: 'Toast API base URL. Keep default unless Toast provides a different host.',
    })
    @IsOptional()
    @IsUrl({ require_tld: true }, { message: 'apiBaseUrl must be a valid URL' })
    apiBaseUrl?: string;

    @ApiPropertyOptional({
        default: 24,
        description: 'Default order backfill window (hours) used when no explicit range is passed.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(24 * 30)
    defaultOrderLookbackHours?: number;

    @ApiPropertyOptional({
        default: false,
        description: 'Reserved for future scheduler-based automatic sync.',
    })
    @IsOptional()
    @IsBoolean()
    autoSyncEnabled?: boolean;

    @ApiPropertyOptional({
        default: true,
        description: 'Enable or disable Toast integration for this restaurant.',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
