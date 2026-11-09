/**
 * Why a stock movement happened.
 *
 * The list is deliberately limited to workflows that the product roadmap
 * defines. A movement without a reason would make the ledger impossible to
 * explain in reports and corrections.
 */

export const STOCK_MOVEMENT_REASONS = [
  'RECEIVING',
  'PRODUCTION_INPUT',
  'PRODUCTION_OUTPUT',
  'SALES_CHECKPOINT',
  'ADJUSTMENT',
  'WASTE',
  'CORRECTION',
] as const;

export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export function isStockMovementReason(value: unknown): value is StockMovementReason {
  return typeof value === 'string' && (STOCK_MOVEMENT_REASONS as readonly string[]).includes(value);
}
