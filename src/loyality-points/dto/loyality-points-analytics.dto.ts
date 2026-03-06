import { ApiProperty } from '@nestjs/swagger';

export class LoyalityPointsAnalyticsDto {
    @ApiProperty({
        description: 'Total number of active loyalty programs',
        example: 8,
    })
    totalActivePrograms: number;

    @ApiProperty({
        description: 'Number of new programs created in the last 30 days',
        example: 2,
    })
    newProgramsCount: number;

    @ApiProperty({
        description:
            'Redemption rate as a percentage (redeemed customers / total members * 100)',
        example: 24.5,
    })
    redemptionRate: number;

    @ApiProperty({
        description:
            'Change in redemption rate compared to the previous period (percentage points)',
        example: 1.2,
    })
    redemptionRateChange: number;

    @ApiProperty({
        description: 'Total unique members (customers) across all programs',
        example: 1240,
    })
    totalMembers: number;
}
