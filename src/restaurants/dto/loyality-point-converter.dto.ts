import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDecimal, IsOptional, IsString } from 'class-validator';

export class CreateLoyalityPointsConverterDto {
    @ApiProperty({ example: '100' })
    @IsDecimal({ decimal_digits: '0,2' })
    points: string;

    @ApiProperty({ example: '10' })
    @IsDecimal({ decimal_digits: '0,2' })
    value: string;

    @ApiProperty({ example: 'INR', required: false })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    isActive?: boolean;
}