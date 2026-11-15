import { describe, expect, it } from 'vitest';

import { formatStockQuantity, parseStockQuantityMilli } from './stock-quantity.js';

describe('stock quantity entry', () => {
  it('parses positive and signed thousandths', () => {
    expect(parseStockQuantityMilli('12')).toBe(12_000);
    expect(parseStockQuantityMilli('12.5')).toBe(12_500);
    expect(parseStockQuantityMilli('12,5')).toBe(12_500);
    expect(parseStockQuantityMilli('-3.25', { allowNegative: true })).toBe(-3_250);
  });

  it('allows zero only when requested', () => {
    expect(parseStockQuantityMilli('0')).toBeUndefined();
    expect(parseStockQuantityMilli('0', { allowZero: true })).toBe(0);
  });

  it('rejects negative values unless requested and rejects junk', () => {
    expect(parseStockQuantityMilli('-1')).toBeUndefined();
    expect(parseStockQuantityMilli('1.2345')).toBeUndefined();
    expect(parseStockQuantityMilli('abc')).toBeUndefined();
  });

  it('formats thousandths', () => {
    expect(formatStockQuantity(12_500, 'en')).toBe('12.5');
    expect(formatStockQuantity(-750, 'en')).toBe('-0.75');
  });
});
