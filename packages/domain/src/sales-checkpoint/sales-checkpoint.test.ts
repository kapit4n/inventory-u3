import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asProductPresentationId,
  asSalesCheckpointId,
  asSalesCheckpointItemId,
  asUserId,
} from '@inventory-u3/types';

import {
  confirmSalesCheckpoint,
  correctSalesCheckpoint,
  createSalesCheckpoint,
  type NewSalesCheckpoint,
} from './sales-checkpoint.js';

const NOW = '2026-11-16T10:00:00.000Z';
const CONFIRMED_AT = '2026-11-16T11:00:00.000Z';
const CORRECTED_AT = '2026-11-16T12:00:00.000Z';

function checkpointInput(overrides: Partial<NewSalesCheckpoint> = {}): NewSalesCheckpoint {
  return {
    id: asSalesCheckpointId('checkpoint-1'),
    organizationId: asOrganizationId('organization-1'),
    branchId: asBranchId('branch-1'),
    businessDate: '2026-11-16',
    period: 'MORNING',
    registeredByUserId: asUserId('user-1'),
    note: '  Midday report  ',
    items: [
      {
        id: asSalesCheckpointItemId('line-1'),
        productId: asProductId('raw-product'),
        productKind: 'RAW',
        unitId: asMeasurementUnitId('unit-kg'),
        quantityMilli: 1_500,
        sellingPriceAmountMinor: 179,
        sellingPriceBasis: 'PER_SALES_UNIT',
        sellingPriceCurrency: 'USD',
      },
      {
        id: asSalesCheckpointItemId('line-2'),
        productId: asProductId('processed-product'),
        productKind: 'PROCESSED',
        unitId: asMeasurementUnitId('unit-kg'),
        presentationId: asProductPresentationId('presentation-1'),
        trayCount: 2,
        averageWeightPerTrayGrams: 500,
        sellingPriceAmountMinor: 249,
        sellingPriceBasis: 'PER_KILOGRAM',
        sellingPriceCurrency: 'USD',
      },
    ],
    ...overrides,
  };
}

describe('createSalesCheckpoint', () => {
  it('snapshots raw quantities and processed tray weights', () => {
    const checkpoint = createSalesCheckpoint(checkpointInput(), NOW);

    expect(checkpoint.status).toBe('DRAFT');
    expect(checkpoint.period).toBe('MORNING');
    expect(checkpoint.note).toBe('Midday report');
    expect(checkpoint.items[0]).toMatchObject({
      productKind: 'RAW',
      quantityMilli: 1_500,
      weightBasis: 'NOT_APPLICABLE',
      sellingPriceAmountMinor: 179,
      estimatedSalesValueMinor: 269,
    });
    expect(checkpoint.items[0]?.presentationId).toBeUndefined();
    expect(checkpoint.items[1]).toMatchObject({
      productKind: 'PROCESSED',
      trayCount: 2,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 1_000,
      quantityMilli: 1_000,
      weightBasis: 'ESTIMATED',
      sellingPriceAmountMinor: 249,
      estimatedSalesValueMinor: 249,
    });
  });

  it('uses a measured processed weight without losing the estimate', () => {
    const checkpoint = createSalesCheckpoint(
      checkpointInput({
        items: [
          {
            id: asSalesCheckpointItemId('line-1'),
            productId: asProductId('processed-product'),
            productKind: 'PROCESSED',
            unitId: asMeasurementUnitId('unit-kg'),
            presentationId: asProductPresentationId('presentation-1'),
            trayCount: 10,
            averageWeightPerTrayGrams: 500,
            measuredWeightGrams: 4_800,
            sellingPriceAmountMinor: 249,
            sellingPriceBasis: 'PER_KILOGRAM',
            sellingPriceCurrency: 'USD',
          },
        ],
      }),
      NOW,
    );

    expect(checkpoint.items[0]).toMatchObject({
      estimatedWeightGrams: 5_000,
      measuredWeightGrams: 4_800,
      quantityMilli: 4_800,
      weightBasis: 'MEASURED',
      estimatedSalesValueMinor: 1_195,
    });
  });

  it('rejects tray fields on a raw line', () => {
    expect(() =>
      createSalesCheckpoint(
        checkpointInput({
          items: [
            {
              id: asSalesCheckpointItemId('line-1'),
              productId: asProductId('raw-product'),
              productKind: 'RAW',
              unitId: asMeasurementUnitId('unit-kg'),
              quantityMilli: 1_500,
              trayCount: 2,
              sellingPriceAmountMinor: 179,
              sellingPriceBasis: 'PER_SALES_UNIT',
              sellingPriceCurrency: 'USD',
            },
          ],
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rejects a processed line without a presentation', () => {
    expect(() =>
      createSalesCheckpoint(
        checkpointInput({
          items: [
            {
              id: asSalesCheckpointItemId('line-1'),
              productId: asProductId('processed-product'),
              productKind: 'PROCESSED',
              unitId: asMeasurementUnitId('unit-kg'),
              trayCount: 2,
              averageWeightPerTrayGrams: 500,
              sellingPriceAmountMinor: 249,
              sellingPriceBasis: 'PER_KILOGRAM',
              sellingPriceCurrency: 'USD',
            },
          ],
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rejects a price basis that does not match the product kind', () => {
    expect(() =>
      createSalesCheckpoint(
        checkpointInput({
          items: [
            {
              id: asSalesCheckpointItemId('line-1'),
              productId: asProductId('raw-product'),
              productKind: 'RAW',
              unitId: asMeasurementUnitId('unit-kg'),
              quantityMilli: 1_500,
              sellingPriceAmountMinor: 179,
              sellingPriceBasis: 'PER_KILOGRAM',
              sellingPriceCurrency: 'USD',
            },
          ],
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rejects empty checkpoints, invalid periods and duplicate lines', () => {
    expect(() => createSalesCheckpoint(checkpointInput({ items: [] }), NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => createSalesCheckpoint(checkpointInput({ period: 'NOON' as never }), NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() =>
      createSalesCheckpoint(
        checkpointInput({
          items: [
            checkpointInput().items[0]!,
            { ...checkpointInput().items[0]!, id: checkpointInput().items[0]!.id },
          ],
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});

describe('sales checkpoint state transitions', () => {
  it('confirms a draft once and preserves its snapshots', () => {
    const draft = createSalesCheckpoint(checkpointInput(), NOW);
    const confirmed = confirmSalesCheckpoint(draft, {
      confirmedByUserId: asUserId('user-2'),
      confirmedAt: CONFIRMED_AT,
    });

    expect(confirmed).toMatchObject({
      status: 'CONFIRMED',
      confirmedByUserId: 'user-2',
      confirmedAt: CONFIRMED_AT,
      updatedAt: CONFIRMED_AT,
      items: draft.items,
    });
    expect(confirmed.items[1]?.estimatedWeightGrams).toBe(1_000);
    expect(() =>
      confirmSalesCheckpoint(confirmed, {
        confirmedByUserId: asUserId('user-2'),
        confirmedAt: CONFIRMED_AT,
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));
  });

  it('corrects a confirmed checkpoint and keeps the audit data', () => {
    const confirmed = confirmSalesCheckpoint(createSalesCheckpoint(checkpointInput(), NOW), {
      confirmedByUserId: asUserId('user-2'),
      confirmedAt: CONFIRMED_AT,
    });
    const corrected = correctSalesCheckpoint(confirmed, {
      correctedByUserId: asUserId('user-3'),
      correctedAt: CORRECTED_AT,
      reason: '  Wrong quantity  ',
    });

    expect(corrected).toMatchObject({
      status: 'CORRECTED',
      correctedByUserId: 'user-3',
      correctedAt: CORRECTED_AT,
      correctionReason: 'Wrong quantity',
      items: confirmed.items,
    });
    expect(() =>
      correctSalesCheckpoint(corrected, {
        correctedByUserId: asUserId('user-3'),
        correctedAt: CORRECTED_AT,
        reason: 'Again',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));
  });

  it('refuses to correct a draft', () => {
    expect(() =>
      correctSalesCheckpoint(createSalesCheckpoint(checkpointInput(), NOW), {
        correctedByUserId: asUserId('user-3'),
        correctedAt: CORRECTED_AT,
        reason: 'Not confirmed',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));
  });
});
