import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDecimal, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
    @ApiPropertyOptional({ example: 'Home' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    label?: string;

    @ApiProperty({ example: '221B Baker Street' })
    @IsString()
    @MaxLength(255)
    line1!: string;

    @ApiPropertyOptional({ example: 'Near Central Park' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    line2?: string;

    @ApiProperty({ example: 'London' })
    @IsString()
    @MaxLength(100)
    city!: string;

    @ApiPropertyOptional({ example: 'Greater London' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    state?: string;

    @ApiPropertyOptional({ example: 'NW1 6XE' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    postalCode?: string;

    @ApiPropertyOptional({ example: 'United Kingdom' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    country?: string;

    @ApiPropertyOptional({ example: '51.523767' })
    @IsOptional()
    @IsDecimal({ decimal_digits: '0,8' })
    latitude?: string;

    @ApiPropertyOptional({ example: '-0.1585557' })
    @IsOptional()
    @IsDecimal({ decimal_digits: '0,8' })
    longitude?: string;

    @ApiPropertyOptional({ example: 'Please call before arrival' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    instructions?: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
