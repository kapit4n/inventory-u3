/**
 * Entry and display helpers for production quantities.
 *
 * Input and waste quantities use the exact thousandth convention of the stock
 * ledger. Tray weights are integer grams, displayed in kilograms for the
 * operator.
 */

import type { Locale } from '../../i18n/index.js';

const QUANTITY_PATTERN = /^(\d+)(?:[.,](\d{1,3}))?$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

export function parseQuantityMilli(value: string): number | undefined {
  const match = QUANTITY_PATTERN.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const quantity = Number(`${match[1]}${(match[2] ?? '').padEnd(3, '0')}`);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : undefined;
}

export function parseWholeNumber(value: string): number | undefined {
  if (!WHOLE_NUMBER_PATTERN.test(value.trim())) {
    return undefined;
  }

  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function formatQuantityMilli(quantityMilli: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(quantityMilli / 1000);
}

export function formatWeightGrams(grams: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(grams / 1000);
}

export function formatTrays(trayCount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale).format(trayCount);
}
