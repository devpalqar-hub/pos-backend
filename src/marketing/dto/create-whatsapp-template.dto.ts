import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateWhatsappTemplateDto {
    @ApiProperty({
        description: 'Template name in lowercase alphanumeric + underscores',
        example: 'order_confirmation',
    })
    @IsString()
    name!: string;

    @ApiProperty({
        description: 'Template language code',
        example: 'en_US',
    })
    @IsString()
    language!: string;

    @ApiProperty({
        description: 'Template category',
        example: 'UTILITY',
        enum: ['AUTHENTICATION', 'MARKETING', 'UTILITY'],
    })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    @IsString()
    category!: string;

    @ApiPropertyOptional({
        description: 'Named or positional parameter format',
        example: 'positional',
        enum: ['named', 'positional'],
    })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsOptional()
    @IsIn(['named', 'positional'])
    @IsString()
    parameter_format?: string;

    @ApiProperty({
        description: 'WhatsApp template components as accepted by the Meta Graph API',
        type: [Object],
    })
    @IsArray()
    components!: Record<string, any>[];

    @ApiPropertyOptional({
        description: 'Allow Meta to adjust category if needed',
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    allow_category_change?: boolean;
}