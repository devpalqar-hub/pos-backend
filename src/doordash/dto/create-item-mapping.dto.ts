import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemMappingDto {
  @ApiProperty({
    example: 'uuid-of-your-menu-item',
    description: 'The local POS menu item UUID to map the DoorDash item to.',
  })
  @IsUUID()
  menuItemId: string;

  @ApiPropertyOptional({
    example: 'dd_item_abc123',
    description:
      'The DoorDash item ID (from the DoorDash catalogue / webhook payload `items[].id`). ' +
      'When not supplied, match falls back to doorDashItemName.',
  })
  @IsOptional()
  @IsString()
  doorDashItemId?: string;

  @ApiPropertyOptional({
    example: 'Classic Burger',
    description:
      'Fallback name-based match — used when doorDashItemId is absent. ' +
      'The webhook item name is matched case-insensitively.',
  })
  @IsOptional()
  @IsString()
  doorDashItemName?: string;
}
