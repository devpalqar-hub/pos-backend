import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString } from 'class-validator';

export class CreateCartDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    customerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sessionId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    guestId?: string;

    @ApiPropertyOptional({
        description: 'Loyalty offer UUID to redeem at checkout. Customer must have enough loyalty points.',
    })
    @IsOptional()
    @IsUUID()
    loyaltyOfferId?: string;
}