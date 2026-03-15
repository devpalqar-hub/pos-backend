import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRestaurantFeatureDto {
    @ApiProperty({
        required: false,
        description: 'Enable or disable the feature',
    })
    @IsOptional()
    @IsBoolean()
    isEnabled?: boolean;
}