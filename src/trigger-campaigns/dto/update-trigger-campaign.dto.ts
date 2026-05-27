import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateTriggerCampaignDto } from './create-trigger-campaign.dto';

/**
 * All fields from CreateTriggerCampaignDto are optional on update.
 * Additionally exposes the `isActive` toggle:
 *  - false → campaign is disabled and will no longer fire triggers
 *  - Admins (OWNER / RESTAURANT_ADMIN) still see it in GET /trigger-campaigns
 */
export class UpdateTriggerCampaignDto extends PartialType(CreateTriggerCampaignDto) {
    @ApiPropertyOptional({
        example: false,
        description:
            'Set to false to disable this trigger campaign. ' +
            'Inactive campaigns will not evaluate triggers or send messages. ' +
            'Admins (OWNER / RESTAURANT_ADMIN) can still see and re-activate them.',
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
