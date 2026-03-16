import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDecimal, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { CreateBillItemDto } from './create-bill-item.dto';

export class CreateBillDto {
    @ApiProperty()
    @IsUUID()
    sessionId: string;

    @ApiProperty({ type: [CreateBillItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateBillItemDto)
    items: CreateBillItemDto[];

    @ApiProperty()
    @IsDecimal()
    taxRate: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDecimal()
    discountAmount?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}