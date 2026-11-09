import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asOrganizationId,
  asProductId,
  asStockMovementId,
  asUserId,
} from '@inventory-u3/types';

import * as stock from './index.js';
import { createStockMovement, type NewStockMovement } from './stock-movement.js';
import type { StockMovementReason } from './stock-movement-reason.js';
import type { StockMovementSourceType } from './stock-movement-source.js';

const OCCURRED_AT = '2026-11-09T10:00:00.000Z';
const RECORDED_AT = '2026-11-09T10:05:00.000Z';
const ORGANIZATION_ID = asOrganizationId('11111111-1111-4111-8111-111111111111');
const BRANCH_ID = asBranchId('22222222-2222-4222-8222-222222222222');
const PRODUCT_ID = asProductId('33333333-3333-4333-8333-333333333333');
const MOVEMENT_ID = asStockMovementId('44444444-4444-4444-8444-444444444444');
const CORRECTION_ID = asStockMovementId('55555555-5555-4555-8555-555555555555');
const USER_ID = asUserId('66666666-6666-4666-8666-666666666666');

function createMovement(overrides: Partial<NewStockMovement> = {}) {
  return createStockMovement(
    {
      id: MOVEMENT_ID,
      organizationId: ORGANIZATION_ID,
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      quantityDelta: 12.5,
      reason: 'RECEIVING',
      occurredAt: OCCURRED_AT,
      recordedByUserId: USER_ID,
      ...overrides,
    },
    RECORDED_AT,
  );
}

describe('createStockMovement', () => {
  it('creates a movement with source, note and both timestamps', () => {
    const movement = createMovement({
      source: { type: 'PURCHASE_RECEIPT', id: '  receipt-1  ' },
      note: '  delivery  ',
    });

    expect(movement).toEqual({
      id: MOVEMENT_ID,
      organizationId: ORGANIZATION_ID,
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      quantityDelta: 12.5,
      reason: 'RECEIVING',
      source: { type: 'PURCHASE_RECEIPT', id: 'receipt-1' },
      occurredAt: OCCURRED_AT,
      recordedAt: RECORDED_AT,
      recordedByUserId: USER_ID,
      note: 'delivery',
    });
  });

  it('omits optional source, correction and blank note', () => {
    const movement = createMovement({ note: '   ' });

    expect(movement.source).toBeUndefined();
    expect(movement.correctsMovementId).toBeUndefined();
    expect(movement.note).toBeUndefined();
    expect('note' in movement).toBe(false);
  });

  it('accepts a negative quantity for consumption or loss', () => {
    const movement = createMovement({ quantityDelta: -3.25, reason: 'WASTE' });

    expect(movement.quantityDelta).toBe(-3.25);
  });

  it.each([0, -0, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects the invalid quantity %s',
    (quantityDelta) => {
      expect(() => createMovement({ quantityDelta })).toThrowError(
        'Stock movement quantity must be a finite non-zero number',
      );
    },
  );

  it('rejects an unknown reason', () => {
    expect(() => createMovement({ reason: 'UNKNOWN' as StockMovementReason })).toThrowError(
      'Stock movement reason must be a known reason',
    );
  });

  it('accepts a correction that references a different movement', () => {
    const correction = createMovement({
      id: CORRECTION_ID,
      quantityDelta: -12.5,
      reason: 'CORRECTION',
      correctsMovementId: MOVEMENT_ID,
    });

    expect(correction.correctsMovementId).toBe(MOVEMENT_ID);
  });

  it('requires a correction to reference the corrected movement', () => {
    expect(() => createMovement({ reason: 'CORRECTION' })).toThrowError(
      'A correction must reference the stock movement it corrects',
    );
  });

  it('rejects a movement that corrects itself', () => {
    expect(() =>
      createMovement({ reason: 'CORRECTION', correctsMovementId: MOVEMENT_ID }),
    ).toThrowError('A stock movement cannot correct itself');
  });

  it('rejects a corrected reference on a non-correction movement', () => {
    expect(() => createMovement({ correctsMovementId: CORRECTION_ID })).toThrowError(
      'Only a correction may reference a corrected stock movement',
    );
  });

  it('rejects an unknown source type', () => {
    expect(() =>
      createMovement({
        source: { type: 'UNKNOWN' as StockMovementSourceType, id: 'source-1' },
      }),
    ).toThrowError('Stock movement source type must be a known type');
  });

  it('rejects a source with a blank id', () => {
    expect(() => createMovement({ source: { type: 'ADJUSTMENT', id: '   ' } })).toThrowError(
      'Stock movement source id must not be empty',
    );
  });

  it('returns frozen movements and frozen nested sources', () => {
    const movement = createMovement({
      source: { type: 'SALES_CHECKPOINT', id: 'checkpoint-1' },
    });

    expect(Object.isFrozen(movement)).toBe(true);
    expect(Object.isFrozen(movement.source)).toBe(true);

    expect(() => {
      (movement as unknown as { quantityDelta: number }).quantityDelta = 99;
    }).toThrow(TypeError);
    expect(movement.quantityDelta).toBe(12.5);
  });

  it('exposes creation but no update or delete API', () => {
    expect('createStockMovement' in stock).toBe(true);
    expect('updateStockMovement' in stock).toBe(false);
    expect('deleteStockMovement' in stock).toBe(false);
  });
});
