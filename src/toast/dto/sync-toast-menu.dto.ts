import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class SyncToastMenuDto {
  @ApiPropertyOptional({
    default: false,
    description: 'When true, fetches full menu even if /metadata indicates no changes.',
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
