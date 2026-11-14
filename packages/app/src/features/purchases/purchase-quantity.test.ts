import { describe, expect, it } from 'vitest';

import { formatQuantity, parseQuantityMilli } from './purchase-quantity.js';

describe('purchase quantity entry', () => {
  it('parses whole and decimal quantities into thousandths', () => {
    expect(parseQuantityMilli('12')).toBe(12_000);
    expect(parseQuantityMilli('12.5')).toBe(12_500);
    expect(parseQuantityMilli('12,5')).toBe(12_500);
    expect(parseQuantityMilli('0.125')).toBe(125);
    expect(parseQuantityMilli(' 1.05 ')).toBe(1_050);
  });

  it('rejects zero, too many decimals, negatives and junk', () => {
    expect(parseQuantityMilli('0')).toBeUndefined();
    expect(parseQuantityMilli('0.000')).toBeUndefined();
    expect(parseQuantityMilli('1.2345')).toBeUndefined();
    expect(parseQuantityMilli('-1')).toBeUndefined();
    expect(parseQuantityMilli('abc')).toBeUndefined();
    expect(parseQuantityMilli('')).toBeUndefined();
  });

  it('formats thousandths without floating point noise', () => {
    expect(formatQuantity(12_500, 'en')).toBe('12.5');
    expect(formatQuantity(1_000, 'en')).toBe('1');
  });
});
