import { PartialType } from '@nestjs/swagger';
import { CreateTriggerCampaignDto } from './create-trigger-campaign.dto';

export class UpdateTriggerCampaignDto extends PartialType(CreateTriggerCampaignDto) { }
