import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Min,
    ValidateNested,
    ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// Mirror Prisma enums to avoid importing @prisma/client in DTOs

export enum MarketingChannelEnum {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    WHATSAPP = 'WHATSAPP',
}

export enum RuleGroupOperatorEnum {
    AND = 'AND',
    OR = 'OR',
}

export enum TriggerRuleConditionEnum {
    VISITED_IN_DATE_RANGE = 'VISITED_IN_DATE_RANGE',
    VISITED_ON_DAY = 'VISITED_ON_DAY',
    ORDERED_ITEMS = 'ORDERED_ITEMS',
    HAS_PENDING_LOYALTY = 'HAS_PENDING_LOYALTY',
    MIN_VISIT_COUNT = 'MIN_VISIT_COUNT',
    MIN_SPEND_AMOUNT = 'MIN_SPEND_AMOUNT',
}

export class TriggerCampaignRuleDto {
    @ApiProperty({
        enum: TriggerRuleConditionEnum,
        description: 'Trigger condition type',
        example: TriggerRuleConditionEnum.VISITED_ON_DAY,
    })
    @IsEnum(TriggerRuleConditionEnum)
    condition: TriggerRuleConditionEnum;

    @ApiPropertyOptional({
        description: `Condition value — depends on condition type:
- VISITED_IN_DATE_RANGE: JSON \`{"startDate":"2026-03-01","endDate":"2026-03-31"}\`
- VISITED_ON_DAY: Day of week e.g. \`MONDAY\` (or comma-separated: \`MONDAY,FRIDAY\`)
- ORDERED_ITEMS: JSON array of menu item IDs \`["uuid1","uuid2"]\`
- HAS_PENDING_LOYALTY: minimum points threshold (omit or null for any)
- MIN_VISIT_COUNT: minimum number of visits
- MIN_SPEND_AMOUNT: minimum total spend amount`,
        example: 'MONDAY',
    })
    @IsOptional()
    @IsString()
    value?: string;
}

export class CreateTriggerCampaignDto {
    @ApiProperty({ example: 'Returning Customer Reward', description: 'Trigger campaign name' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ description: 'Internal description / notes' })
    @IsOptional()
    @IsString()
    description?: string;

    // ─── Content ──────────────────────────────────────────────────────────────

    @ApiPropertyOptional({
        example: 'Welcome back {{name}}!',
        description: 'Email subject line. Supports {{name}} and {{restaurant}} placeholders.',
    })
    @IsOptional()
    @IsString()
    subject?: string;

    @ApiPropertyOptional({
        example: 'Hi {{name}}, we miss you at {{restaurant}}! Come back for a special treat.',
        description: 'Plain-text body for SMS / WhatsApp. Supports {{name}} and {{restaurant}} placeholders.',
    })
    @IsOptional()
    @IsString()
    textContent?: string;

    @ApiPropertyOptional({ description: 'Full HTML email body with placeholder support.' })
    @IsOptional()
    @IsString()
    htmlContent?: string;

    @ApiPropertyOptional({
        example: 'https://cdn.example.com/promo.jpg',
        description: 'Promotional image URL.',
    })
    @IsOptional()
    @IsUrl()
    imageUrl?: string;

    // ─── Channels ─────────────────────────────────────────────────────────────

    @ApiProperty({
        isArray: true,
        enum: MarketingChannelEnum,
        description: 'Delivery channels for this trigger campaign.',
        example: [MarketingChannelEnum.SMS, MarketingChannelEnum.EMAIL],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(MarketingChannelEnum, { each: true })
    channels: MarketingChannelEnum[];

    // ─── Rules ────────────────────────────────────────────────────────────────

    @ApiPropertyOptional({
        enum: RuleGroupOperatorEnum,
        default: RuleGroupOperatorEnum.AND,
        description: 'How multiple rules combine — AND (all must match) or OR (any match).',
    })
    @IsOptional()
    @IsEnum(RuleGroupOperatorEnum)
    ruleOperator?: RuleGroupOperatorEnum;

    @ApiPropertyOptional({
        type: [TriggerCampaignRuleDto],
        description: 'Trigger rules. At least one rule is recommended. If empty, all customers are eligible.',
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TriggerCampaignRuleDto)
    rules?: TriggerCampaignRuleDto[];

    // ─── Repeat configuration ────────────────────────────────────────────────

    @ApiProperty({
        example: 7,
        description: 'Minimum number of days between repeated triggers for the same customer.',
        default: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    repeatDelayDays?: number;

    @ApiPropertyOptional({
        example: 5,
        description: 'Maximum number of times the campaign triggers for a single customer. Null = unlimited.',
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxTriggersPerCustomer?: number;

    // ─── Expiration ───────────────────────────────────────────────────────────

    @ApiPropertyOptional({
        description: 'ISO-8601 datetime after which the campaign automatically stops triggering.',
        example: '2026-06-01T00:00:00.000Z',
    })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
