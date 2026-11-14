import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asPurchaseCorrectionId,
  asPurchaseId,
  asPurchaseItemId,
  asSupplierId,
  asUserId,
} from '@inventory-u3/types';

import {
  PURCHASE_CORRECTION_REASON_MAX_LENGTH,
  correctPurchase,
  createPurchaseCorrection,
} from './purchase-correction.js';
import {
  PURCHASE_NOTE_MAX_LENGTH,
  cancelPurchase,
  createPurchase,
  quantityMilliToNumber,
  receivePurchase,
  type NewPurchase,
} from './purchase.js';

const NOW = '2026-11-13T12:00:00.000Z';
const LATER = '2026-11-13T13:00:00.000Z';
const ORGANIZATION_ID = asOrganizationId('11111111-1111-4111-8111-111111111111');
const BRANCH_ID = asBranchId('22222222-2222-4222-8222-222222222222');
const SUPPLIER_ID = asSupplierId('33333333-3333-4333-8333-333333333333');
const USER_ID = asUserId('44444444-4444-4444-8444-444444444444');
const PURCHASE_ID = asPurchaseId('55555555-5555-4555-8555-555555555555');
const ITEM_ID = asPurchaseItemId('66666666-6666-4666-8666-666666666666');
const SECOND_ITEM_ID = asPurchaseItemId('77777777-7777-4777-8777-777777777777');
const PRODUCT_ID = asProductId('88888888-8888-4888-8888-888888888888');
const SECOND_PRODUCT_ID = asProductId('99999999-9999-4999-8999-999999999999');
const KILOGRAM_ID = asMeasurementUnitId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const CORRECTION_ID = asPurchaseCorrectionId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

function newPurchase(overrides: Partial<NewPurchase> = {}): NewPurchase {
  return {
    id: PURCHASE_ID,
    organizationId: ORGANIZATION_ID,
    branchId: BRANCH_ID,
    supplierId: SUPPLIER_ID,
    deliveryDate: '2026-11-13',
    currency: 'USD',
    createdByUserId: USER_ID,
    items: [
      {
        id: ITEM_ID,
        productId: PRODUCT_ID,
        unitId: KILOGRAM_ID,
        quantityMilli: 12_500,
        unitPriceMinor: 350,
      },
      {
        id: SECOND_ITEM_ID,
        productId: SECOND_PRODUCT_ID,
        unitId: KILOGRAM_ID,
        quantityMilli: 1_500,
        unitPriceMinor: 333,
      },
    ],
    ...overrides,
  };
}

describe('createPurchase', () => {
  it('creates a draft purchase with exact line and purchase totals', () => {
    const purchase = createPurchase(newPurchase({ note: '  morning delivery  ' }), NOW);

    expect(purchase).toMatchObject({
      id: PURCHASE_ID,
      organizationId: ORGANIZATION_ID,
      branchId: BRANCH_ID,
      supplierId: SUPPLIER_ID,
      status: 'DRAFT',
      deliveryDate: '2026-11-13',
      currency: 'USD',
      totalMinor: 4_875,
      note: 'morning delivery',
      createdByUserId: USER_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(purchase.items).toEqual([
      {
        id: ITEM_ID,
        organizationId: ORGANIZATION_ID,
        purchaseId: PURCHASE_ID,
        productId: PRODUCT_ID,
        unitId: KILOGRAM_ID,
        quantityMilli: 12_500,
        unitPriceMinor: 350,
        lineTotalMinor: 4_375,
        position: 1,
        createdAt: NOW,
      },
      {
        id: SECOND_ITEM_ID,
        organizationId: ORGANIZATION_ID,
        purchaseId: PURCHASE_ID,
        productId: SECOND_PRODUCT_ID,
        unitId: KILOGRAM_ID,
        quantityMilli: 1_500,
        unitPriceMinor: 333,
        lineTotalMinor: 500,
        position: 2,
        createdAt: NOW,
      },
    ]);
    expect(purchase.receivedAt).toBeUndefined();
    expect(purchase.receivedByUserId).toBeUndefined();
  });

  it('omits a blank note', () => {
    const purchase = createPurchase(newPurchase({ note: '   ' }), NOW);

    expect(purchase.note).toBeUndefined();
  });

  it('rejects an empty purchase', () => {
    expect(() => createPurchase(newPurchase({ items: [] }), NOW)).toThrowError(
      'A purchase must have at least one item',
    );
  });

  it('rejects an invalid delivery date', () => {
    expect(() => createPurchase(newPurchase({ deliveryDate: '2026-02-30' }), NOW)).toThrowError(
      'Purchase delivery date must be a valid date',
    );
  });

  it('rejects a non-uppercase currency', () => {
    expect(() => createPurchase(newPurchase({ currency: 'usd' }), NOW)).toThrowError(
      'Purchase currency must be a three-letter code',
    );
  });

  it('rejects a note that is too long', () => {
    expect(() =>
      createPurchase(newPurchase({ note: 'n'.repeat(PURCHASE_NOTE_MAX_LENGTH + 1) }), NOW),
    ).toThrowError(`Purchase note must be between 1 and ${PURCHASE_NOTE_MAX_LENGTH} characters`);
  });

  it('rejects duplicate item identifiers', () => {
    const purchase = newPurchase();
    expect(() =>
      createPurchase(
        newPurchase({
          items: [purchase.items[0]!, { ...purchase.items[1]!, id: purchase.items[0]!.id }],
        }),
        NOW,
      ),
    ).toThrowError('A purchase item identifier must be unique');
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the invalid quantity %s',
    (quantityMilli) => {
      expect(() =>
        createPurchase(
          newPurchase({
            items: [
              {
                id: ITEM_ID,
                productId: PRODUCT_ID,
                unitId: KILOGRAM_ID,
                quantityMilli,
                unitPriceMinor: 100,
              },
            ],
          }),
          NOW,
        ),
      ).toThrowError('Purchase quantity must be a positive thousandth');
    },
  );

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the invalid unit price %s',
    (unitPriceMinor) => {
      expect(() =>
        createPurchase(
          newPurchase({
            items: [
              {
                id: ITEM_ID,
                productId: PRODUCT_ID,
                unitId: KILOGRAM_ID,
                quantityMilli: 1_000,
                unitPriceMinor,
              },
            ],
          }),
          NOW,
        ),
      ).toThrowError('Purchase unit price must be a non-negative whole number in minor units');
    },
  );
});

describe('receivePurchase', () => {
  it('marks a draft as received and records the actor and time', () => {
    const purchase = createPurchase(newPurchase(), NOW);
    const received = receivePurchase(purchase, {
      receivedByUserId: USER_ID,
      receivedAt: LATER,
    });

    expect(received).toMatchObject({
      status: 'RECEIVED',
      receivedByUserId: USER_ID,
      receivedAt: LATER,
      updatedAt: LATER,
    });
    expect(received.items).toBe(purchase.items);
  });

  it('refuses to receive twice', () => {
    const received = receivePurchase(createPurchase(newPurchase(), NOW), {
      receivedByUserId: USER_ID,
      receivedAt: LATER,
    });

    expect(() =>
      receivePurchase(received, { receivedByUserId: USER_ID, receivedAt: LATER }),
    ).toThrowError('Only a draft purchase can be received');
  });
});

describe('cancelPurchase', () => {
  it('cancels a draft without touching its items', () => {
    const purchase = createPurchase(newPurchase(), NOW);
    const cancelled = cancelPurchase(purchase, LATER);

    expect(cancelled).toMatchObject({ status: 'CANCELLED', cancelledAt: LATER, updatedAt: LATER });
    expect(cancelled.items).toBe(purchase.items);
  });

  it('refuses to cancel a received purchase', () => {
    const received = receivePurchase(createPurchase(newPurchase(), NOW), {
      receivedByUserId: USER_ID,
      receivedAt: LATER,
    });

    expect(() => cancelPurchase(received, LATER)).toThrowError(
      'Only a draft purchase can be cancelled',
    );
  });
});

describe('purchase corrections', () => {
  function correction(reason = 'Wrong delivery recorded') {
    return createPurchaseCorrection(
      {
        id: CORRECTION_ID,
        organizationId: ORGANIZATION_ID,
        purchaseId: PURCHASE_ID,
        correctedByUserId: USER_ID,
        reason,
        beforeTotalMinor: 4_875,
      },
      LATER,
    );
  }

  it('creates an audited full-reversal correction', () => {
    expect(correction('  Wrong delivery recorded  ')).toEqual({
      id: CORRECTION_ID,
      organizationId: ORGANIZATION_ID,
      purchaseId: PURCHASE_ID,
      correctedByUserId: USER_ID,
      reason: 'Wrong delivery recorded',
      beforeTotalMinor: 4_875,
      afterTotalMinor: 0,
      correctedAt: LATER,
    });
  });

  it('rejects a missing or oversized reason', () => {
    expect(() => correction('   ')).toThrowError(
      `Correction reason must be between 1 and ${PURCHASE_CORRECTION_REASON_MAX_LENGTH} characters`,
    );
    expect(() => correction('r'.repeat(PURCHASE_CORRECTION_REASON_MAX_LENGTH + 1))).toThrowError(
      `Correction reason must be between 1 and ${PURCHASE_CORRECTION_REASON_MAX_LENGTH} characters`,
    );
  });

  it('marks a received purchase as corrected and records the auditor', () => {
    const received = receivePurchase(createPurchase(newPurchase(), NOW), {
      receivedByUserId: USER_ID,
      receivedAt: LATER,
    });
    const corrected = correctPurchase(received, correction(), LATER);

    expect(corrected).toMatchObject({
      status: 'CORRECTED',
      correctedByUserId: USER_ID,
      correctedAt: LATER,
      updatedAt: LATER,
    });
    expect(corrected.receivedAt).toBe(LATER);
    expect(corrected.items).toBe(received.items);
  });

  it('refuses to correct a draft or a mismatch', () => {
    const draft = createPurchase(newPurchase(), NOW);
    expect(() => correctPurchase(draft, correction(), LATER)).toThrowError(
      'Only a received purchase can be corrected',
    );

    const received = receivePurchase(createPurchase(newPurchase(), NOW), {
      receivedByUserId: USER_ID,
      receivedAt: LATER,
    });
    const otherPurchaseCorrection = {
      ...correction(),
      purchaseId: asPurchaseId('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
    };
    expect(() => correctPurchase(received, otherPurchaseCorrection, LATER)).toThrowError(
      'Correction must reference the purchase it corrects',
    );

    const wrongTotalCorrection = { ...correction(), beforeTotalMinor: 1 };
    expect(() => correctPurchase(received, wrongTotalCorrection, LATER)).toThrowError(
      'Correction before total must match the purchase total',
    );
  });
});

describe('quantityMilliToNumber', () => {
  it('converts the stored thousandths to the inventory-unit number', () => {
    expect(quantityMilliToNumber(12_500)).toBe(12.5);
    expect(quantityMilliToNumber(1)).toBe(0.001);
  });
});
