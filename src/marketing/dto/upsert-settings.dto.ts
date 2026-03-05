import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpsertMarketingSettingsDto {
  // ─── SMTP ─────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'smtp.gmail.com', description: 'SMTP server host' })
  @IsOptional()
  @IsString()
  smtpHost?: string;

  @ApiPropertyOptional({ example: 587, description: 'SMTP server port' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ApiPropertyOptional({ example: 'user@gmail.com', description: 'SMTP authentication username' })
  @IsOptional()
  @IsString()
  smtpUser?: string;

  @ApiPropertyOptional({ example: 'secret', description: 'SMTP authentication password' })
  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @ApiPropertyOptional({ example: 'noreply@restaurant.com', description: 'From address for sent emails' })
  @IsOptional()
  @IsEmail()
  smtpFromEmail?: string;

  @ApiPropertyOptional({ example: 'My Restaurant', description: 'From display name for sent emails' })
  @IsOptional()
  @IsString()
  smtpFromName?: string;

  @ApiPropertyOptional({ default: true, description: 'Use TLS/SSL for SMTP connection' })
  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  // ─── Twilio SMS ───────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'ACxxxxxxxxxxxxxxxx', description: 'Twilio Account SID' })
  @IsOptional()
  @IsString()
  twilioAccountSid?: string;

  @ApiPropertyOptional({ example: 'auth_token_here', description: 'Twilio Auth Token' })
  @IsOptional()
  @IsString()
  twilioAuthToken?: string;

  @ApiPropertyOptional({ example: '+15551234567', description: 'Twilio from phone number (E.164)' })
  @IsOptional()
  @IsString()
  twilioFromNumber?: string;

  // ─── WhatsApp Business (Meta Cloud API) ──────────────────────────────────

  @ApiPropertyOptional({ example: '1234567890', description: 'WhatsApp Business Account ID' })
  @IsOptional()
  @IsString()
  waBaId?: string;

  @ApiPropertyOptional({ example: '9876543210', description: 'WhatsApp Phone Number ID from Meta Cloud API' })
  @IsOptional()
  @IsString()
  waPhoneNumberId?: string;

  @ApiPropertyOptional({ example: 'EAAxxxx...', description: 'Meta Cloud API access token (Bearer)' })
  @IsOptional()
  @IsString()
  waAccessToken?: string;
}
