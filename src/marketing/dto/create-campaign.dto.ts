import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  ArrayMinSize,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Mirror of Prisma enums — avoids importing from @prisma/client in DTOs
export enum MarketingChannelEnum {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export enum RuleGroupOperatorEnum {
  AND = 'AND',
  OR = 'OR',
}

export enum RuleConditionTypeEnum {
  ALL_CUSTOMERS = 'ALL_CUSTOMERS',
  MIN_ORDERS = 'MIN_ORDERS',
  MAX_ORDERS = 'MAX_ORDERS',
  MIN_SPEND = 'MIN_SPEND',
  MAX_SPEND = 'MAX_SPEND',
  LAST_ORDER_WITHIN_DAYS = 'LAST_ORDER_WITHIN_DAYS',
  ORDER_CHANNEL = 'ORDER_CHANNEL',
  MIN_LOYALTY_POINTS = 'MIN_LOYALTY_POINTS',
}

export class CampaignRuleDto {
  @ApiProperty({
    enum: RuleConditionTypeEnum,
    description: 'Targeting condition type',
    example: RuleConditionTypeEnum.MIN_ORDERS,
  })
  @IsEnum(RuleConditionTypeEnum)
  condition: RuleConditionTypeEnum;

  @ApiPropertyOptional({
    description:
      'Condition value — a number for MIN_ORDERS / MAX_ORDERS / MIN_SPEND / MAX_SPEND / LAST_ORDER_WITHIN_DAYS / MIN_LOYALTY_POINTS; ' +
      'one of DINE_IN | ONLINE_OWN | UBER_EATS for ORDER_CHANNEL; omit for ALL_CUSTOMERS.',
    example: '3',
  })
  @IsOptional()
  @IsString()
  value?: string;
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Weekend Special Promo', description: 'Internal campaign name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Internal description / notes' })
  @IsOptional()
  @IsString()
  description?: string;

  // ─── Content ──────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    example: 'Exclusive Weekend Offer Just for You, {{name}}!',
    description: 'Email subject line. Supports {{name}} and {{restaurant}} placeholders.',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    example: 'Hi {{name}}, enjoy 20% off this weekend at {{restaurant}}! 🎉',
    description:
      'Plain-text message body for SMS / WhatsApp and plain-text email fallback. ' +
      'Supports {{name}} and {{restaurant}} placeholders.',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description:
      'Full HTML email body. Supports {{name}} and {{restaurant}} placeholders. ' +
      'Can also embed the imageUrl: use <img src="{{imageUrl}}" /> in your HTML.',
  })
  @IsOptional()
  @IsString()
  htmlContent?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/promo.jpg',
    description: 'Promotional image URL — uploaded via POST /upload/image, or any public URL.',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  // ─── Channels ─────────────────────────────────────────────────────────────

  @ApiProperty({
    isArray: true,
    enum: MarketingChannelEnum,
    description: 'One or more delivery channels to use for this campaign.',
    example: [MarketingChannelEnum.EMAIL, MarketingChannelEnum.SMS],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(MarketingChannelEnum, { each: true })
  channels: MarketingChannelEnum[];

  // ─── Targeting ────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    enum: RuleGroupOperatorEnum,
    default: RuleGroupOperatorEnum.AND,
    description: 'How multiple rules are combined — AND (must match all) or OR (match any).',
  })
  @IsOptional()
  @IsEnum(RuleGroupOperatorEnum)
  ruleOperator?: RuleGroupOperatorEnum;

  @ApiPropertyOptional({
    type: [CampaignRuleDto],
    description:
      'Targeting rules to filter eligible customers. Leave empty (or include ALL_CUSTOMERS) to target everyone.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignRuleDto)
  rules?: CampaignRuleDto[];

  // ─── Schedule ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'ISO-8601 datetime to auto-trigger the campaign. ' +
      'Leave blank when using the /trigger endpoint manually.',
    example: '2026-03-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
