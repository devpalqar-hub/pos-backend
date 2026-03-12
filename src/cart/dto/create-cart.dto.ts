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
    guestId?: string;
}