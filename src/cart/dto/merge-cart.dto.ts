import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class MergeCartDto {
    @ApiProperty()
    @IsString()
    sessionId!: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    guestId?: string;

    @ApiProperty()
    @IsUUID()
    customerId!: string;
}