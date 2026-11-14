/**
 * Quantity entry and display for purchases.
 *
 * The API stores quantities as integer thousandths (`12.5 kg` → `12500`). The
 * browser may accept a decimal with a comma or a dot, but the value sent over
 * the wire is always an integer.
 */

import type { Locale } from '../../i18n/index.js';

const QUANTITY_PATTERN = /^(\d+)(?:[.,](\d{1,3}))?$/;

export function parseQuantityMilli(value: string): number | undefined {
  const match = QUANTITY_PATTERN.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const quantity = Number(`${match[1]}${(match[2] ?? '').padEnd(3, '0')}`);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : undefined;
}

export function formatQuantity(quantityMilli: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(quantityMilli / 1000);
}
