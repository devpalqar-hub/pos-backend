import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum BatchStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    READY = 'READY',
    SERVED = 'SERVED',
    CANCELLED = 'CANCELLED',
}

export class UpdateBatchStatusDto {
    @ApiProperty({ enum: BatchStatus })
    @IsEnum(BatchStatus)
    status: BatchStatus;
}
