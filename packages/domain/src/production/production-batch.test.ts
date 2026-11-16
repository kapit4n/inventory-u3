import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asEmployeeId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asProductPresentationId,
  asProductionBatchId,
  asProductionInputId,
  asProductionOutputId,
  asProductionWasteId,
  asUserId,
} from '@inventory-u3/types';

import {
  confirmProductionBatch,
  correctProductionBatch,
  createProductionBatch,
  productionOutputQuantityMilli,
  type NewProductionBatch,
} from './production-batch.js';

const NOW = '2026-11-15T10:00:00.000Z';
const CONFIRMED_AT = '2026-11-15T11:00:00.000Z';
const CORRECTED_AT = '2026-11-15T12:00:00.000Z';

function batchInput(overrides: Partial<NewProductionBatch> = {}): NewProductionBatch {
  return {
    id: asProductionBatchId('batch-1'),
    organizationId: asOrganizationId('organization-1'),
    branchId: asBranchId('branch-1'),
    businessDate: '2026-11-15',
    preparedByEmployeeId: asEmployeeId('employee-1'),
    registeredByUserId: asUserId('user-1'),
    note: '  Morning preparation  ',
    inputs: [
      {
        id: asProductionInputId('input-1'),
        productId: asProductId('raw-product'),
        unitId: asMeasurementUnitId('unit-kg'),
        quantityMilli: 12_500,
      },
    ],
    outputs: [
      {
        id: asProductionOutputId('output-1'),
        productId: asProductId('processed-product'),
        presentationId: asProductPresentationId('presentation-1'),
        trayCount: 24,
        averageWeightPerTrayGrams: 500,
      },
    ],
    waste: [
      {
        id: asProductionWasteId('waste-1'),
        productId: asProductId('raw-product'),
        quantityMilli: 500,
        reason: '  Trim loss  ',
      },
    ],
    ...overrides,
  };
}

describe('createProductionBatch', () => {
  it('calculates estimated weight and snapshots the presentation average', () => {
    const batch = createProductionBatch(batchInput(), NOW);

    expect(batch.status).toBe('DRAFT');
    expect(batch.note).toBe('Morning preparation');
    expect(batch.outputs[0]).toMatchObject({
      trayCount: 24,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 12_000,
      weightBasis: 'ESTIMATED',
      position: 1,
    });
    expect(batch.inputs[0]).toMatchObject({ quantityMilli: 12_500, position: 1 });
    expect(batch.waste[0]).toMatchObject({ quantityMilli: 500, reason: 'Trim loss', position: 1 });
  });

  it('stores a measured weight without overwriting the estimate', () => {
    const batch = createProductionBatch(
      batchInput({
        outputs: [
          {
            id: asProductionOutputId('output-1'),
            productId: asProductId('processed-product'),
            presentationId: asProductPresentationId('presentation-1'),
            trayCount: 10,
            averageWeightPerTrayGrams: 500,
            measuredWeightGrams: 4_800,
          },
        ],
      }),
      NOW,
    );

    expect(batch.outputs[0]).toMatchObject({
      estimatedWeightGrams: 5_000,
      measuredWeightGrams: 4_800,
      weightBasis: 'MEASURED',
    });
    expect(productionOutputQuantityMilli(batch.outputs[0]!)).toBe(4_800);
  });

  it('accepts a waste-only batch because waste is an explicit production outcome', () => {
    const batch = createProductionBatch(batchInput({ outputs: [], inputs: [] }), NOW);

    expect(batch.outputs).toEqual([]);
    expect(batch.waste).toHaveLength(1);
  });

  it('rejects an empty batch', () => {
    expect(() =>
      createProductionBatch(batchInput({ inputs: [], outputs: [], waste: [] }), NOW),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rejects duplicate line identifiers across sections', () => {
    expect(() =>
      createProductionBatch(
        batchInput({
          waste: [
            {
              id: asProductionWasteId('input-1'),
              productId: asProductId('raw-product'),
              quantityMilli: 500,
              reason: 'Trim loss',
            },
          ],
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rejects invalid tray counts, weights and quantities', () => {
    const invalidOutput = batchInput({
      outputs: [
        {
          id: asProductionOutputId('output-1'),
          productId: asProductId('processed-product'),
          presentationId: asProductPresentationId('presentation-1'),
          trayCount: 0,
          averageWeightPerTrayGrams: 500,
        },
      ],
    });
    const invalidInput = batchInput({
      inputs: [
        {
          id: asProductionInputId('input-1'),
          productId: asProductId('raw-product'),
          unitId: asMeasurementUnitId('unit-kg'),
          quantityMilli: -1,
        },
      ],
    });

    expect(() => createProductionBatch(invalidOutput, NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => createProductionBatch(invalidInput, NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });

  it('rejects an invalid business date', () => {
    expect(() => createProductionBatch(batchInput({ businessDate: '15/11/2026' }), NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});

describe('production state transitions', () => {
  it('confirms a draft once and freezes its snapshots', () => {
    const draft = createProductionBatch(batchInput(), NOW);
    const confirmed = confirmProductionBatch(draft, {
      confirmedByUserId: asUserId('user-2'),
      confirmedAt: CONFIRMED_AT,
    });

    expect(confirmed).toMatchObject({
      status: 'CONFIRMED',
      confirmedByUserId: 'user-2',
      confirmedAt: CONFIRMED_AT,
      updatedAt: CONFIRMED_AT,
      outputs: draft.outputs,
    });
    expect(confirmed.outputs[0]?.averageWeightPerTrayGrams).toBe(500);
    expect(() =>
      confirmProductionBatch(confirmed, {
        confirmedByUserId: asUserId('user-2'),
        confirmedAt: CONFIRMED_AT,
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));
  });

  it('corrects a confirmed batch and keeps the correction audit data', () => {
    const confirmed = confirmProductionBatch(createProductionBatch(batchInput(), NOW), {
      confirmedByUserId: asUserId('user-2'),
      confirmedAt: CONFIRMED_AT,
    });
    const corrected = correctProductionBatch(confirmed, {
      correctedByUserId: asUserId('user-3'),
      correctedAt: CORRECTED_AT,
      reason: '  Wrong tray count  ',
    });

    expect(corrected).toMatchObject({
      status: 'CORRECTED',
      correctedByUserId: 'user-3',
      correctedAt: CORRECTED_AT,
      correctionReason: 'Wrong tray count',
      outputs: confirmed.outputs,
    });
    expect(() =>
      correctProductionBatch(corrected, {
        correctedByUserId: asUserId('user-3'),
        correctedAt: CORRECTED_AT,
        reason: 'Again',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));
  });

  it('refuses to correct a draft', () => {
    expect(() =>
      correctProductionBatch(createProductionBatch(batchInput(), NOW), {
        correctedByUserId: asUserId('user-3'),
        correctedAt: CORRECTED_AT,
        reason: 'Not confirmed',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));
  });
});
