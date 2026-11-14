import { describe, expect, it } from 'vitest';

import {
  currencyFractionDigits,
  formatCurrencyAmount,
  parseCurrencyAmount,
} from './price-format.js';

describe('product price formatting', () => {
  it('parses major units into exact integer minor units', () => {
    expect(parseCurrencyAmount('4', 'USD')).toBe(400);
    expect(parseCurrencyAmount('4.5', 'USD')).toBe(450);
    expect(parseCurrencyAmount('4.05', 'USD')).toBe(405);
    expect(parseCurrencyAmount('0', 'USD')).toBe(0);
  });

  it('accepts a comma decimal separator', () => {
    expect(parseCurrencyAmount('4,25', 'USD')).toBe(425);
  });

  it('rejects malformed amounts and excess fraction digits', () => {
    for (const value of ['', '-1', '1.234', 'abc', '1,2,3']) {
      expect(parseCurrencyAmount(value, 'USD')).toBeUndefined();
    }
  });

  it('uses the currency fraction digits', () => {
    expect(currencyFractionDigits('USD')).toBe(2);
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(parseCurrencyAmount('450', 'JPY')).toBe(450);
    expect(parseCurrencyAmount('450.5', 'JPY')).toBeUndefined();
  });

  it('formats a minor-unit amount for display', () => {
    expect(formatCurrencyAmount(400, 'USD', 'en')).toContain('4.00');
    expect(formatCurrencyAmount(400, 'USD', 'es')).toContain('4,00');
  });
});
