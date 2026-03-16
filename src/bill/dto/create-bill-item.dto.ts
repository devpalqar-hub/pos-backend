import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, IsPositive } from 'class-validator';

export class CreateBillItemDto {
    @ApiProperty()
    @IsUUID()
    menuItemId: string;

    @ApiProperty()
    @IsInt()
    @IsPositive()
    quantity: number;
}