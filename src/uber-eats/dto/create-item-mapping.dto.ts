import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUberEatsItemMappingDto {
    @ApiProperty({
        example: 'uuid-of-your-menu-item',
        description: 'The local POS menu item UUID to map the Uber Eats item to.',
    })
    @IsUUID()
    menuItemId: string;

    @ApiPropertyOptional({
        example: 'ue_item_abc123',
        description:
            'The Uber Eats item ID (from the Uber Eats catalogue / webhook payload `items[].id`). ' +
            'When not supplied, match falls back to uberEatsItemName.',
    })
    @IsOptional()
    @IsString()
    uberEatsItemId?: string;

    @ApiPropertyOptional({
        example: 'Classic Burger',
        description:
            'Fallback name-based match — used when uberEatsItemId is absent. ' +
            'The webhook item name is matched case-insensitively.',
    })
    @IsOptional()
    @IsString()
    uberEatsItemName?: string;
}
