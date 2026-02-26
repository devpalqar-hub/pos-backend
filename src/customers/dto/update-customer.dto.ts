import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class UpdateCustomerDto {
    @ApiPropertyOptional({
        description: 'Customer phone number',
        example: '+1234567890',
        maxLength: 30,
    })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;

    @ApiPropertyOptional({
        description: 'Customer name',
        example: 'John Doe',
        maxLength: 255,
    })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        description: 'Activate or deactivate the customer',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
