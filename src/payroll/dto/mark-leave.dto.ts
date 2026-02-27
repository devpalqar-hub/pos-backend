import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LeaveType } from '@prisma/client';

export class MarkLeaveDto {
    @ApiProperty({
        description: 'Date of leave (ISO 8601 date)',
        example: '2026-02-15',
    })
    @IsNotEmpty({ message: 'Leave date is required' })
    @Type(() => Date)
    date: Date;

    @ApiPropertyOptional({
        description: 'Leave type — defaults to auto-detected (PAID until allowance exhausted, then UNPAID)',
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

export class BulkMarkLeaveDto {
    @ApiProperty({
        description: 'Array of leave dates (ISO 8601)',
        example: ['2026-02-15', '2026-02-16'],
        type: [Date],
    })
    @IsNotEmpty({ message: 'At least one date is required' })
    @Type(() => Date)
    dates: Date[];

    @ApiPropertyOptional({
        description: 'Leave type — defaults to auto-detected (PAID until allowance exhausted, then UNPAID)',
        enum: LeaveType,
        example: 'PAID',
    })
    @IsOptional()
    @IsEnum(LeaveType, { message: 'leaveType must be PAID or UNPAID' })
    leaveType?: LeaveType;

    @ApiPropertyOptional({
        description: 'Reason for leave',
        example: 'Vacation',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
