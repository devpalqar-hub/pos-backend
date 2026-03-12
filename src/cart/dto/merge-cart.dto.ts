import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class MergeCartDto {
    @ApiProperty()
    @IsString()
    guestId: string;

    @ApiProperty()
    @IsUUID()
    customerId: string;
}