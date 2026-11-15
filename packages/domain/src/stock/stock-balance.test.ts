import { describe, expect, it } from 'vitest';

import { assertStockDoesNotGoNegative } from './stock-balance.js';

describe('assertStockDoesNotGoNegative', () => {
  it('accepts a zero or positive result', () => {
    expect(() => assertStockDoesNotGoNegative(10_000, -10_000)).not.toThrow();
    expect(() => assertStockDoesNotGoNegative(0, 2_500)).not.toThrow();
  });

  it('refuses a negative result and includes the quantities', () => {
    expect(() => assertStockDoesNotGoNegative(1_000, -1_001, { productId: 'p1' })).toThrowError(
      expect.objectContaining({
        code: 'INSUFFICIENT_STOCK',
        details: expect.objectContaining({
          currentQuantityMilli: 1_000,
          deltaQuantityMilli: -1_001,
          resultingQuantityMilli: -1,
          productId: 'p1',
        }),
      }),
    );
  });

  it('rejects non-integer thousandths', () => {
    expect(() => assertStockDoesNotGoNegative(1.5, -1)).toThrowError(
      'Stock quantities must be integers in thousandths',
    );
  });
});
