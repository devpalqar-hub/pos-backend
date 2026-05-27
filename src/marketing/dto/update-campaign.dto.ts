import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCampaignDto } from './create-campaign.dto';

/**
 * All fields from CreateCampaignDto are optional on update.
 * Additionally exposes the `isActive` toggle:
 *  - false → campaign is hidden from customer-facing listings and cannot be triggered
 *  - Admins (OWNER / RESTAURANT_ADMIN) still see it in GET /campaigns
 */
export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiPropertyOptional({
    example: false,
    description:
      'Set to false to disable this campaign. ' +
      'Inactive campaigns are hidden from customer-facing listings and cannot be triggered. ' +
      'Admins (OWNER / RESTAURANT_ADMIN) can still see and re-activate them.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
