/**
 * The record that caused a stock movement, when one exists.
 *
 * Source records are future transactional entities; this vocabulary only names
 * the reference. The source id is kept as text because those entities do not
 * exist yet and each will have its own branded identifier when implemented.
 */

export const STOCK_MOVEMENT_SOURCE_TYPES = [
  'PURCHASE_RECEIPT',
  'PURCHASE_CORRECTION',
  'PRODUCTION_BATCH',
  'SALES_CHECKPOINT',
  'ADJUSTMENT',
  'WASTE_REPORT',
] as const;

export type StockMovementSourceType = (typeof STOCK_MOVEMENT_SOURCE_TYPES)[number];

export function isStockMovementSourceType(value: unknown): value is StockMovementSourceType {
  return (
    typeof value === 'string' && (STOCK_MOVEMENT_SOURCE_TYPES as readonly string[]).includes(value)
  );
}

export interface StockMovementSource {
  readonly type: StockMovementSourceType;
  readonly id: string;
}
