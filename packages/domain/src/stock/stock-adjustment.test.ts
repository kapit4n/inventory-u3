import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asOrganizationId,
  asProductId,
  asStockAdjustmentId,
  asUserId,
} from '@inventory-u3/types';

import { createManualAdjustment, createReconciliation } from './stock-adjustment.js';
import { createInventoryWaste } from './inventory-waste.js';
import { asInventoryWasteId } from '@inventory-u3/types';

const NOW = '2026-11-15T10:00:00.000Z';
const ORGANIZATION_ID = asOrganizationId('11111111-1111-4111-8111-111111111111');
const BRANCH_ID = asBranchId('22222222-2222-4222-8222-222222222222');
const PRODUCT_ID = asProductId('33333333-3333-4333-8333-333333333333');
const ADJUSTMENT_ID = asStockAdjustmentId('44444444-4444-4444-8444-444444444444');
const WASTE_ID = asInventoryWasteId('55555555-5555-4555-8555-555555555555');
const USER_ID = asUserId('66666666-6666-4666-8666-666666666666');

const base = {
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  occurredAt: NOW,
  recordedByUserId: USER_ID,
  reason: 'Opening count',
};

describe('stock adjustments', () => {
  it('creates a manual adjustment with a trimmed reason and note', () => {
    const adjustment = createManualAdjustment(
      { ...base, id: ADJUSTMENT_ID, quantityDeltaMilli: 12_500, note: '  opening  ' },
      NOW,
    );

    expect(adjustment).toMatchObject({
      kind: 'MANUAL',
      quantityDeltaMilli: 12_500,
      reason: 'Opening count',
      note: 'opening',
      recordedAt: NOW,
    });
    expect(Object.isFrozen(adjustment)).toBe(true);
  });

  it('rejects a zero manual adjustment', () => {
    expect(() =>
      createManualAdjustment({ ...base, id: ADJUSTMENT_ID, quantityDeltaMilli: 0 }, NOW),
    ).toThrowError('A manual adjustment must change the stock quantity');
  });

  it('computes reconciliation quantity from expected and counted values', () => {
    const adjustment = createReconciliation(
      {
        ...base,
        id: ADJUSTMENT_ID,
        reason: 'Physical count',
        expectedQuantityMilli: 10_000,
        countedQuantityMilli: 9_250,
      },
      NOW,
    );

    expect(adjustment).toMatchObject({
      kind: 'RECONCILIATION',
      expectedQuantityMilli: 10_000,
      countedQuantityMilli: 9_250,
      quantityDeltaMilli: -750,
    });
  });

  it('allows a zero-difference reconciliation as an audit record', () => {
    const adjustment = createReconciliation(
      {
        ...base,
        id: ADJUSTMENT_ID,
        reason: 'Physical count',
        expectedQuantityMilli: 10_000,
        countedQuantityMilli: 10_000,
      },
      NOW,
    );

    expect(adjustment.quantityDeltaMilli).toBe(0);
  });

  it('rejects negative reconciliation quantities and blank reasons', () => {
    expect(() =>
      createReconciliation(
        {
          ...base,
          id: ADJUSTMENT_ID,
          reason: 'Physical count',
          expectedQuantityMilli: -1,
          countedQuantityMilli: 0,
        },
        NOW,
      ),
    ).toThrowError('Reconciliation quantities must not be negative');

    expect(() =>
      createManualAdjustment(
        { ...base, id: ADJUSTMENT_ID, reason: '   ', quantityDeltaMilli: 1_000 },
        NOW,
      ),
    ).toThrowError('Stock reason must be between 1 and 500 characters');
  });
});

describe('inventory waste', () => {
  it('stores a positive quantity and optional note', () => {
    const waste = createInventoryWaste(
      { ...base, id: WASTE_ID, quantityMilli: 2_500, reason: 'Damaged' },
      NOW,
    );

    expect(waste).toMatchObject({
      quantityMilli: 2_500,
      reason: 'Damaged',
      recordedAt: NOW,
    });
    expect(Object.isFrozen(waste)).toBe(true);
  });

  it('rejects zero or non-integer quantities', () => {
    expect(() =>
      createInventoryWaste({ ...base, id: WASTE_ID, quantityMilli: 0 }, NOW),
    ).toThrowError('Waste quantity must be greater than zero');

    expect(() =>
      createInventoryWaste({ ...base, id: WASTE_ID, quantityMilli: 1.5 }, NOW),
    ).toThrowError('Waste quantity must be an integer in thousandths');
  });
});
