import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum SessionStatus {
    OPEN = 'OPEN',
    BILLED = 'BILLED',
    PAID = 'PAID',
    CANCELLED = 'CANCELLED',
    VOID = 'VOID',
}

export class UpdateSessionStatusDto {
    @ApiProperty({ enum: SessionStatus })
    @IsEnum(SessionStatus)
    status: SessionStatus;
}
