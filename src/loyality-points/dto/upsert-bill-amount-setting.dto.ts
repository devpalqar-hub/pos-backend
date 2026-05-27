import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

/**
 * Create or update the bill-amount-to-points loyalty setting for a restaurant.
 *
 * When enabled, a customer's bill amount is multiplied by `pointsPerAmount` to
 * compute loyalty points. This candidate then competes with all active
 * `LoyalityPoint` rules; only the **highest** point value is awarded.
 *
 * Example: pointsPerAmount = 0.10  →  $100 bill = 10 loyalty points
 */
export class UpsertBillAmountSettingDto {
    @ApiProperty({
        example: true,
        description:
            'Enable or disable the bill-amount loyalty method. ' +
            'When false this method is skipped and does not compete with other loyalty rules.',
    })
    @IsBoolean()
    isEnabled: boolean;

    @ApiPropertyOptional({
        example: 0.1,
        description:
            'Points awarded per unit of currency. ' +
            'For example 0.10 means every $1 of the bill earns 0.10 points. ' +
            'Required when isEnabled is true.',
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    pointsPerAmount?: number;
}
