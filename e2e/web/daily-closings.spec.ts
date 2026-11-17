import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const CLOSING_ID = '99999999-9999-4999-8999-999999999999';
const NEXT_CLOSING_ID = '99999999-9999-4999-8999-000000000002';
const TIMESTAMP = '2026-10-05T20:00:00.000Z';
const BUSINESS_DATE = '2026-10-05';

const ORGANIZATION = {
  id: ORGANIZATION_ID,
  name: 'Inventory U3',
  timezone: 'America/Lima',
  currency: 'USD',
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Central Market',
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const PRODUCT = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Apple',
  kind: 'RAW',
  inventoryUnitId: UNIT_ID,
  salesUnitId: UNIT_ID,
  purchaseUnitId: UNIT_ID,
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const ITEM = {
  productId: PRODUCT_ID,
  productKind: 'RAW',
  unitId: UNIT_ID,
  openingQuantityMilli: 10_000,
  purchasedQuantityMilli: 2_000,
  producedQuantityMilli: 0,
  soldQuantityMilli: 3_000,
  wasteQuantityMilli: 500,
  adjustmentQuantityMilli: 100,
  correctionQuantityMilli: -100,
  reconciliationDifferenceQuantityMilli: -100,
  closingQuantityMilli: 8_500,
  estimatedRevenueMinor: 900,
  unitCostAmountMinor: 350,
  costBasis: 'LATEST_PURCHASE_PRICE',
  estimatedCostOfSalesMinor: 1_050,
  position: 1,
};

const DRAFT_CLOSING = {
  id: CLOSING_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  businessDate: BUSINESS_DATE,
  version: 1,
  status: 'DRAFT',
  currency: 'USD',
  purchasesTotalMinor: 700,
  purchaseCount: 1,
  unreceivedPurchaseCount: 0,
  productionBatchCount: 1,
  productionDraftCount: 0,
  productionTrayCount: 2,
  productionEstimatedWeightGrams: 1_000,
  salesCheckpointCount: 1,
  draftSalesCheckpointCount: 0,
  salesTotalMinor: 900,
  wasteRecordCount: 1,
  inventoryDifferenceProductCount: 1,
  estimatedRevenueMinor: 900,
  estimatedCostMinor: 1_050,
  estimatedGrossProfitMinor: -150,
  missingCostProductCount: 0,
  negativeStockProductCount: 0,
  createdByUserId: USER_ID,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  items: [ITEM],
};

const CONFIRMED_CLOSING = {
  ...DRAFT_CLOSING,
  status: 'CONFIRMED',
  confirmedByUserId: USER_ID,
  confirmedAt: TIMESTAMP,
};

const REOPENED_CLOSING = {
  ...DRAFT_CLOSING,
  id: NEXT_CLOSING_ID,
  version: 2,
  previousClosingId: CLOSING_ID,
};

function closingFixtures(
  closings: readonly unknown[],
  overrides: MockedResponses = {},
): MockedResponses {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/products': { body: { items: [PRODUCT] } },
    'GET /api/v1/daily-closings': { body: { items: closings } },
    ...overrides,
  };
}

test.describe('Daily closings', () => {
  test('opens a closing for a branch and date', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    const api = await installApi(
      page,
      closingFixtures([], {
        'POST /api/v1/daily-closings': { status: 201, body: DRAFT_CLOSING },
      }),
    );

    await page.goto('/daily-closings');
    await expect(page.getByText('No daily closings for this selection')).toBeVisible();

    await page.getByTestId('daily-closing-new').click();
    await page.getByTestId('daily-closing-create-submit').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      branchId: BRANCH_ID,
      businessDate: BUSINESS_DATE,
    });
    await expect(page.getByText('Daily closing detail')).toBeVisible();
    await expect(page.getByText('$9.00').first()).toBeVisible();
    await expect(page.getByText('Apple').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('reviews, confirms and reopens with an audit reason', async ({ page }) => {
    const api = await installApi(
      page,
      closingFixtures([DRAFT_CLOSING], {
        [`POST /api/v1/daily-closings/${CLOSING_ID}/review`]: {
          body: {
            ...DRAFT_CLOSING,
            status: 'REVIEWED',
            reviewedByUserId: USER_ID,
            reviewedAt: TIMESTAMP,
          },
        },
        [`POST /api/v1/daily-closings/${CLOSING_ID}/confirm`]: { body: CONFIRMED_CLOSING },
        [`POST /api/v1/daily-closings/${CLOSING_ID}/reopen`]: { body: REOPENED_CLOSING },
      }),
    );

    await page.goto('/daily-closings');
    await page.getByTestId(`daily-closing-view-${CLOSING_ID}`).click();
    await expect(page.getByText('Daily closing detail')).toBeVisible();

    await page.getByTestId('daily-closing-review').click();
    await expect(page.getByText('Reviewed').first()).toBeVisible();
    await page.getByTestId('daily-closing-confirm').click();
    await expect(page.getByTestId('daily-closing-reopen')).toBeVisible();

    await page.getByTestId('daily-closing-reopen').click();
    await page.getByTestId('daily-closing-reopen-reason').fill('Evening sales arrived late');
    await page.getByTestId('daily-closing-reopen-submit').click();

    await expect(page.getByText('Reopened from version 1')).toBeVisible();
    const reopen = api.recorded.find((row) => row.url.endsWith('/reopen'));
    expect(reopen?.body).toEqual({ reason: 'Evening sales arrived late' });
  });
});
