import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveType } from '@prisma/client';

export class UpdateLeaveDto {
    @ApiPropertyOptional({
        description: 'Date of leave (ISO 8601 date)',
        example: '2026-02-15',
    })
    @IsOptional()
    @Type(() => Date)
    date?: Date;

    @ApiPropertyOptional({
        description: 'Leave type (PAID or UNPAID)',
        enum: LeaveType,
        example: 'PAID',
    })
    @IsOptional()
    @IsEnum(LeaveType, { message: 'leaveType must be PAID or UNPAID' })
    leaveType?: LeaveType;

    @ApiPropertyOptional({
        description: 'Reason for leave',
        example: 'Medical emergency',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
