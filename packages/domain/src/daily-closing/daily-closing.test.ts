import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asDailyClosingId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asUserId,
} from '@inventory-u3/types';

import {
  confirmDailyClosing,
  createDailyClosing,
  reopenDailyClosing,
  reviewDailyClosing,
  roundMilliAmount,
  type DailyClosingSources,
  type NewDailyClosing,
} from './daily-closing.js';

const NOW = '2026-11-16T20:00:00.000Z';
const REVIEWED_AT = '2026-11-16T21:00:00.000Z';
const CONFIRMED_AT = '2026-11-16T22:00:00.000Z';
const REOPENED_AT = '2026-11-17T08:00:00.000Z';
const UNIT_ID = asMeasurementUnitId('unit-kg');
const RAW_PRODUCT_ID = asProductId('product-raw');
const PROCESSED_PRODUCT_ID = asProductId('product-processed');

function sources(overrides: Partial<DailyClosingSources> = {}): DailyClosingSources {
  return {
    stockLines: [
      {
        productId: RAW_PRODUCT_ID,
        productKind: 'RAW',
        unitId: UNIT_ID,
        openingQuantityMilli: 10_000,
        movementQuantityMilli: -1_500,
        purchasedQuantityMilli: 2_000,
        producedQuantityMilli: 0,
        wasteQuantityMilli: 500,
        adjustmentQuantityMilli: 200,
        correctionQuantityMilli: -100,
      },
      {
        productId: PROCESSED_PRODUCT_ID,
        productKind: 'PROCESSED',
        unitId: UNIT_ID,
        openingQuantityMilli: 5_000,
        movementQuantityMilli: 0,
        purchasedQuantityMilli: 0,
        producedQuantityMilli: 1_000,
        wasteQuantityMilli: 0,
        adjustmentQuantityMilli: 0,
        correctionQuantityMilli: 0,
      },
    ],
    salesLines: [
      {
        productId: RAW_PRODUCT_ID,
        productKind: 'RAW',
        unitId: UNIT_ID,
        quantityMilli: 3_000,
        revenueMinor: 900,
      },
      {
        productId: PROCESSED_PRODUCT_ID,
        productKind: 'PROCESSED',
        unitId: UNIT_ID,
        quantityMilli: 1_000,
        revenueMinor: 500,
      },
    ],
    costLines: [
      {
        productId: RAW_PRODUCT_ID,
        unitId: UNIT_ID,
        unitPriceMinor: 300,
        deliveryDate: '2026-11-14',
        receivedAt: '2026-11-14T09:00:00.000Z',
        purchaseId: 'purchase-older',
      },
      {
        productId: RAW_PRODUCT_ID,
        unitId: UNIT_ID,
        unitPriceMinor: 350,
        deliveryDate: '2026-11-16',
        receivedAt: '2026-11-16T09:00:00.000Z',
        purchaseId: 'purchase-latest',
      },
    ],
    reconciliations: [{ productId: RAW_PRODUCT_ID, quantityDeltaMilli: -100 }],
    purchasesTotalMinor: 700,
    purchaseCount: 1,
    unreceivedPurchaseCount: 1,
    productionBatchCount: 1,
    productionDraftCount: 1,
    productionTrayCount: 2,
    productionEstimatedWeightGrams: 1_000,
    salesCheckpointCount: 1,
    draftSalesCheckpointCount: 1,
    wasteRecordCount: 1,
    ...overrides,
  };
}

function closingInput(overrides: Partial<NewDailyClosing> = {}): NewDailyClosing {
  return {
    id: asDailyClosingId('closing-1'),
    organizationId: asOrganizationId('organization-1'),
    branchId: asBranchId('branch-1'),
    businessDate: '2026-11-16',
    version: 1,
    currency: 'USD',
    createdByUserId: asUserId('user-1'),
    sources: sources(),
    ...overrides,
  };
}

describe('createDailyClosing', () => {
  it('snapshots quantities, revenue and latest purchase cost', () => {
    const closing = createDailyClosing(closingInput(), NOW);

    expect(closing).toMatchObject({
      status: 'DRAFT',
      version: 1,
      purchasesTotalMinor: 700,
      purchaseCount: 1,
      unreceivedPurchaseCount: 1,
      productionBatchCount: 1,
      productionDraftCount: 1,
      productionTrayCount: 2,
      productionEstimatedWeightGrams: 1_000,
      salesCheckpointCount: 1,
      draftSalesCheckpointCount: 1,
      salesTotalMinor: 1_400,
      wasteRecordCount: 1,
      inventoryDifferenceProductCount: 1,
      estimatedRevenueMinor: 1_400,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: 350,
      missingCostProductCount: 1,
      negativeStockProductCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });

    const raw = closing.items.find((item) => item.productId === RAW_PRODUCT_ID);
    expect(raw).toMatchObject({
      openingQuantityMilli: 10_000,
      purchasedQuantityMilli: 2_000,
      soldQuantityMilli: 3_000,
      wasteQuantityMilli: 500,
      adjustmentQuantityMilli: 200,
      correctionQuantityMilli: -100,
      reconciliationDifferenceQuantityMilli: -100,
      closingQuantityMilli: 8_500,
      estimatedRevenueMinor: 900,
      unitCostAmountMinor: 350,
      costBasis: 'LATEST_PURCHASE_PRICE',
      estimatedCostOfSalesMinor: 1_050,
      position: 2,
    });

    const processed = closing.items.find((item) => item.productId === PROCESSED_PRODUCT_ID);
    expect(processed).toMatchObject({
      soldQuantityMilli: 1_000,
      estimatedRevenueMinor: 500,
      costBasis: 'UNAVAILABLE',
      estimatedCostOfSalesMinor: 0,
      position: 1,
    });
    expect(processed?.unitCostAmountMinor).toBeUndefined();
  });

  it('requires a cost line in the same unit as the sold product', () => {
    const closing = createDailyClosing(
      closingInput({
        sources: sources({
          costLines: [
            {
              productId: RAW_PRODUCT_ID,
              unitId: asMeasurementUnitId('unit-box'),
              unitPriceMinor: 900,
              deliveryDate: '2026-11-16',
              receivedAt: '2026-11-16T09:00:00.000Z',
              purchaseId: 'purchase-box',
            },
          ],
        }),
      }),
      NOW,
    );

    const raw = closing.items.find((item) => item.productId === RAW_PRODUCT_ID);
    expect(raw).toMatchObject({
      costBasis: 'UNAVAILABLE',
      estimatedCostOfSalesMinor: 0,
    });
    expect(closing.missingCostProductCount).toBe(2);
  });

  it('counts negative closing balances without refusing the snapshot', () => {
    const closing = createDailyClosing(
      closingInput({
        sources: sources({
          stockLines: [
            {
              productId: RAW_PRODUCT_ID,
              productKind: 'RAW',
              unitId: UNIT_ID,
              openingQuantityMilli: 1_000,
              movementQuantityMilli: -1_500,
              purchasedQuantityMilli: 0,
              producedQuantityMilli: 0,
              wasteQuantityMilli: 0,
              adjustmentQuantityMilli: 0,
              correctionQuantityMilli: 0,
            },
          ],
          salesLines: [],
          costLines: [],
          reconciliations: [],
        }),
      }),
      NOW,
    );

    expect(closing.items[0]).toMatchObject({
      closingQuantityMilli: -500,
      soldQuantityMilli: 0,
    });
    expect(closing.negativeStockProductCount).toBe(1);
    expect(closing.missingCostProductCount).toBe(0);
  });

  it('rejects inconsistent inputs', () => {
    expect(() =>
      createDailyClosing(
        closingInput({
          sources: sources({
            salesLines: [
              sources().salesLines[0]!,
              { ...sources().salesLines[0]!, quantityMilli: 100, revenueMinor: 50 },
            ],
          }),
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));

    expect(() => createDailyClosing(closingInput({ businessDate: '16/11/2026' }), NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );

    expect(() => createDailyClosing(closingInput({ version: 0 }), NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );

    expect(() => createDailyClosing(closingInput({ currency: 'usd' }), NOW)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );

    expect(() =>
      createDailyClosing(closingInput({ sources: sources({ purchaseCount: -1 }) }), NOW),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));

    expect(() =>
      createDailyClosing(
        closingInput({
          sources: sources({
            salesLines: [
              {
                productId: RAW_PRODUCT_ID,
                productKind: 'PROCESSED',
                unitId: UNIT_ID,
                quantityMilli: 100,
                revenueMinor: 50,
              },
            ],
          }),
        }),
        NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('rounds fractional-thousandth cost half up', () => {
    expect(roundMilliAmount(1_500, 333)).toBe(500);
    expect(roundMilliAmount(1, 500)).toBe(1);
    expect(roundMilliAmount(1, 499)).toBe(0);
    expect(roundMilliAmount(0, 900)).toBe(0);
    expect(() => roundMilliAmount(-1, 1)).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});

describe('daily closing state transitions', () => {
  it('reviews a draft, confirms it and reopens with a reason', () => {
    const draft = createDailyClosing(closingInput(), NOW);
    const reviewed = reviewDailyClosing(draft, {
      reviewedByUserId: asUserId('user-2'),
      reviewedAt: REVIEWED_AT,
    });
    expect(reviewed).toMatchObject({
      status: 'REVIEWED',
      reviewedByUserId: 'user-2',
      reviewedAt: REVIEWED_AT,
      updatedAt: REVIEWED_AT,
    });

    const confirmed = confirmDailyClosing(reviewed, {
      confirmedByUserId: asUserId('user-2'),
      confirmedAt: CONFIRMED_AT,
    });
    expect(confirmed).toMatchObject({
      status: 'CONFIRMED',
      confirmedByUserId: 'user-2',
      confirmedAt: CONFIRMED_AT,
    });

    const reopened = reopenDailyClosing(confirmed, {
      reopenedByUserId: asUserId('user-3'),
      reopenedAt: REOPENED_AT,
      reason: '  Evening sales arrived late  ',
    });
    expect(reopened).toMatchObject({
      status: 'REOPENED',
      reopenedByUserId: 'user-3',
      reopenedAt: REOPENED_AT,
      reopenReason: 'Evening sales arrived late',
      confirmedByUserId: 'user-2',
    });
  });

  it('enforces transition order', () => {
    const draft = createDailyClosing(closingInput(), NOW);
    const reviewed = reviewDailyClosing(draft, {
      reviewedByUserId: asUserId('user-2'),
      reviewedAt: REVIEWED_AT,
    });
    const confirmed = confirmDailyClosing(reviewed, {
      confirmedByUserId: asUserId('user-2'),
      confirmedAt: CONFIRMED_AT,
    });

    expect(() =>
      reviewDailyClosing(reviewed, {
        reviewedByUserId: asUserId('user-2'),
        reviewedAt: REVIEWED_AT,
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));

    expect(() =>
      confirmDailyClosing(confirmed, {
        confirmedByUserId: asUserId('user-2'),
        confirmedAt: CONFIRMED_AT,
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));

    expect(() =>
      reopenDailyClosing(draft, {
        reopenedByUserId: asUserId('user-3'),
        reopenedAt: REOPENED_AT,
        reason: 'Not confirmed yet',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_STATE' }));

    expect(() =>
      reopenDailyClosing(confirmed, {
        reopenedByUserId: asUserId('user-3'),
        reopenedAt: REOPENED_AT,
        reason: '   ',
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));

    expect(() =>
      reopenDailyClosing(confirmed, {
        reopenedByUserId: asUserId('user-3'),
        reopenedAt: REOPENED_AT,
        reason: 'x'.repeat(501),
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
