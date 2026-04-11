import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export class SyncToastOrdersDto {
  @ApiPropertyOptional({
    description: 'Inclusive ISO-8601 start datetime. If omitted, uses saved cursor or lookback window.',
    example: '2026-04-09T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Exclusive ISO-8601 end datetime. Defaults to now.',
    example: '2026-04-10T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({
    default: 100,
    description: 'Toast ordersBulk page size. Max supported by Toast is 100.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    default: false,
    description: 'When true, ignore saved cursor and use explicit/default time range.',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
