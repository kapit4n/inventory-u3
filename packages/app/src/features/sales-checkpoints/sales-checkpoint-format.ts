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

export function formatQuantityMilli(quantityMilli: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(quantityMilli / 1000);
}

export function formatWeightGrams(grams: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(grams / 1000);
}

export function formatTrays(trayCount: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(trayCount);
}

export function formatMoneyMinor(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100);
}

export function totalEstimatedSalesMinor(
  items: readonly { readonly estimatedSalesValueMinor: number }[],
): number {
  return items.reduce((total, item) => total + item.estimatedSalesValueMinor, 0);
}
