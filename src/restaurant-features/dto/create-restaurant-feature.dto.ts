import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';
import { RestaurantFeature } from '@prisma/client';

export class CreateRestaurantFeatureDto {
    @ApiProperty({
        description: 'Feature type',
        enum: RestaurantFeature,
    })
    @IsEnum(RestaurantFeature)
    feature: RestaurantFeature;

    @ApiProperty({
        description: 'Whether this feature is enabled',
        example: true,
    })
    @IsBoolean()
    isEnabled: boolean;
}