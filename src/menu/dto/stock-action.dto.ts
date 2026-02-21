import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';

export enum StockAction {
  /**
   * Mark item as out of stock.
   * - NON_STOCKABLE: sets isOutOfStock=true. Auto-resets at midnight.
   * - STOCKABLE: sets isOutOfStock=true, stockCount=0.
   */
  MARK_OUT_OF_STOCK = 'MARK_OUT_OF_STOCK',

  /**
   * Set absolute stock count (STOCKABLE only).
   * Requires `quantity`. Sets isOutOfStock=false if quantity > 0.
   */
  SET_STOCK = 'SET_STOCK',

  /**
   * Decrease stock count by the given quantity (STOCKABLE only).
   * Sets isOutOfStock=true automatically when count reaches 0.
   * Requires `quantity`.
   */
  DECREASE_STOCK = 'DECREASE_STOCK',

  /**
   * Manually mark back in stock.
   * - NON_STOCKABLE: sets isOutOfStock=false immediately.
   * - STOCKABLE: requires `quantity` to set the new stock count.
   */
  RESTOCK = 'RESTOCK',
}

export class StockActionDto {
  @ApiProperty({
    description: `
Stock management action:
- **MARK_OUT_OF_STOCK** — Mark the item as unavailable. NON_STOCKABLE items auto-reset at midnight.
- **SET_STOCK** — Set absolute stock count *(STOCKABLE only, requires quantity)*
- **DECREASE_STOCK** — Decrease stock by an amount *(STOCKABLE only, requires quantity)*
- **RESTOCK** — Mark back in stock. NON_STOCKABLE: immediate. STOCKABLE: requires quantity.
    `,
    enum: StockAction,
    example: StockAction.MARK_OUT_OF_STOCK,
  })
  @IsEnum(StockAction, {
    message: `action must be one of: ${Object.values(StockAction).join(', ')}`,
  })
  @IsNotEmpty()
  action: StockAction;

  @ApiPropertyOptional({
    description:
      'Quantity (required for SET_STOCK, DECREASE_STOCK, and RESTOCK on STOCKABLE items). ' +
      'Ignored for NON_STOCKABLE RESTOCK. Must be ≥ 0.',
    example: 20,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'quantity must be an integer' })
  @Min(0, { message: 'quantity must be 0 or greater' })
  quantity?: number;
}
