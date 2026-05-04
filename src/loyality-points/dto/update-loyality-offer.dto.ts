import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';
import { LoyalityOfferTypeDto } from './create-loyality-offer.dto';

export class UpdateLoyalityOfferDto {
    @ApiPropertyOptional({
        description: 'Name/label of the loyalty offer',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Offer type. AMOUNT for bill discount or FOOD for redeeming an item.',
        enum: LoyalityOfferTypeDto,
    })
    @IsOptional()
    @IsEnum(LoyalityOfferTypeDto)
    type?: LoyalityOfferTypeDto;

    @ApiPropertyOptional({
        description: 'Loyalty points required to redeem this offer.',
        example: 500,
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    pointsRequired?: number;

    @ApiPropertyOptional({
        description: 'Discount amount on bill (required when type = AMOUNT).',
        example: 100,
    })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    redeemAmount?: number;

    @ApiPropertyOptional({
        description: 'Menu item UUIDs (required when type = FOOD).',
        example: ['uuid-1', 'uuid-2'],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    menuItemIds?: string[];

    @ApiPropertyOptional({
        description: 'Offer validity start date (ISO 8601).',
        example: '2026-05-01T00:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    validFrom?: string;

    @ApiPropertyOptional({
        description: 'Offer validity end date (ISO 8601).',
        example: '2026-06-01T00:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    validTo?: string;

    @ApiPropertyOptional({
        description: 'Whether this offer is active.',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
