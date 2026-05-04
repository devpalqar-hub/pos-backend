import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';

export enum LoyalityOfferTypeDto {
    AMOUNT = 'AMOUNT',
    FOOD = 'FOOD',
}

export class CreateLoyalityOfferDto {
    @ApiProperty({
        description: 'Name/label of the loyalty offer',
        example: '₹100 Off For 500 Points',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty({ message: 'Name is required' })
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Offer type. AMOUNT for bill discount or FOOD for redeeming an item.',
        enum: LoyalityOfferTypeDto,
        example: LoyalityOfferTypeDto.AMOUNT,
    })
    @IsEnum(LoyalityOfferTypeDto)
    type: LoyalityOfferTypeDto;

    @ApiProperty({
        description: 'Loyalty points required to redeem this offer.',
        example: 500,
    })
    @IsNumber()
    @Min(0.01)
    pointsRequired: number;

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
        example: true,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
