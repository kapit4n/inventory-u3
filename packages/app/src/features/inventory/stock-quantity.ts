/**
 * Quantity entry and display for inventory operations.
 *
 * The API stores integer thousandths. Manual adjustments may be negative;
 * waste and counted quantities are non-negative; a counted quantity may be
 * zero.
 */

import type { Locale } from '../../i18n/index.js';

const STOCK_QUANTITY_PATTERN = /^(-)?(\d+)(?:[.,](\d{1,3}))?$/;

export interface StockQuantityOptions {
  readonly allowNegative?: boolean;
  readonly allowZero?: boolean;
}

export function parseStockQuantityMilli(
  value: string,
  { allowNegative = false, allowZero = false }: StockQuantityOptions = {},
): number | undefined {
  const match = STOCK_QUANTITY_PATTERN.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const isNegative = match[1] === '-';
  if (isNegative && !allowNegative) {
    return undefined;
  }

  const quantity = Number(`${match[2]}${(match[3] ?? '').padEnd(3, '0')}`);
  if (!Number.isSafeInteger(quantity)) {
    return undefined;
  }

  if (quantity === 0 && !allowZero) {
    return undefined;
  }

  return isNegative ? -quantity : quantity;
}

export function formatStockQuantity(quantityMilli: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(quantityMilli / 1000);
}
