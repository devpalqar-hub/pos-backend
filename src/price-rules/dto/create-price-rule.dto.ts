import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PriceRuleType {
  RECURRING_WEEKLY = 'RECURRING_WEEKLY',
  LIMITED_TIME = 'LIMITED_TIME',
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreatePriceRuleDto {
  @ApiProperty({ example: 'Happy Hour Discount', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: PriceRuleType, example: PriceRuleType.RECURRING_WEEKLY })
  @IsEnum(PriceRuleType)
  ruleType: PriceRuleType;

  @ApiProperty({
    description: 'Special price (overrides base price when rule is active)',
    example: '9.99',
  })
  @IsDecimal({ decimal_digits: '0,2' })
  specialPrice: string;

  // ── Time window (optional for both types) ────────────────────────────────
  @ApiPropertyOptional({
    description: 'Start time in HH:mm format (24-hour)',
    example: '10:00',
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @ApiPropertyOptional({
    description: 'End time in HH:mm format (24-hour)',
    example: '12:00',
  })
  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  // ── RECURRING_WEEKLY — required days ─────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Days of week (required for RECURRING_WEEKLY)',
    type: [String],
    enum: DayOfWeek,
    example: [DayOfWeek.MONDAY, DayOfWeek.FRIDAY],
  })
  @ValidateIf((o) => o.ruleType === PriceRuleType.RECURRING_WEEKLY)
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  days?: DayOfWeek[];

  // ── LIMITED_TIME — required date range ───────────────────────────────────
  @ApiPropertyOptional({
    description: 'Start date ISO string (required for LIMITED_TIME)',
    example: '2025-12-01T00:00:00.000Z',
  })
  @ValidateIf((o) => o.ruleType === PriceRuleType.LIMITED_TIME)
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date ISO string (required for LIMITED_TIME)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @ValidateIf((o) => o.ruleType === PriceRuleType.LIMITED_TIME)
  @IsDateString()
  endDate?: string;

  // ── Meta ─────────────────────────────────────────────────────────────────
  @ApiPropertyOptional({
    description: 'Higher priority wins when multiple rules are active',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
