import { IsDateString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerCampaignDto {
  @ApiPropertyOptional({
    description:
      'Optional ISO-8601 datetime to schedule the campaign for a future time. ' +
      'If omitted the campaign is sent immediately.',
    example: '2026-03-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
