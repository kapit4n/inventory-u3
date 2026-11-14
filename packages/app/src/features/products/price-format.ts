/**
 * Formatting at the product-price UI boundary.
 *
 * The API stores integer minor units. The browser parses and displays an
 * amount in major units, but the value sent to the API is always an integer.
 */

import type { Locale } from '../../i18n/index.js';

export function currencyFractionDigits(currency: string): number {
  try {
    return (
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

export function formatCurrencyAmount(
  amountMinor: number,
  currency: string,
  locale: Locale,
): string {
  const digits = currencyFractionDigits(currency);

  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
      amountMinor / 10 ** digits,
    );
  } catch {
    return `${currency} ${(amountMinor / 10 ** digits).toFixed(digits)}`;
  }
}

export function parseCurrencyAmount(value: string, currency: string): number | undefined {
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const digits = currencyFractionDigits(currency);
  const fraction = match[2] ?? '';
  if (fraction.length > digits) {
    return undefined;
  }

  const amount = Number(`${match[1]}${fraction.padEnd(digits, '0')}`);
  return Number.isSafeInteger(amount) ? amount : undefined;
}

export function formatIsoDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}

export function formatIsoDateTime(isoDateTime: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(isoDateTime));
}

export function todayIsoDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}
