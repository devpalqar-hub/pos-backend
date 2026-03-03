import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetStaffAttendanceDto {
    @ApiPropertyOptional({ description: 'Page number (default: 1)' })
    @IsOptional()
    @IsString()
    page?: string;

    @ApiPropertyOptional({ description: 'Items per page (default: 10)' })
    @IsOptional()
    @IsString()
    limit?: string;

    @ApiPropertyOptional({ description: 'Search by staff name or email' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by staff ID' })
    @IsOptional()
    @IsString()
    staffId?: string;

    @ApiPropertyOptional({
        description: 'Filter type: leave, overtime, or all',
        enum: ['leave', 'overtime', 'all'],
        default: 'all',
    })
    @IsOptional()
    @IsIn(['leave', 'overtime', 'all'])
    filter?: 'leave' | 'overtime' | 'all';
}
