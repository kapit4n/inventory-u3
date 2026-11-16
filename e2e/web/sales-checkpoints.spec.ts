/**
 * Sales checkpoints, in a real browser.
 *
 * Component tests cover the form in jsdom; these specs mount `/sales-checkpoints`
 * in Chromium and assert the payloads for creation, confirmation, correction
 * and draft discard.
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const RAW_PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const PROCESSED_PRODUCT_ID = '66666666-6666-4666-8666-666666666666';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const PRESENTATION_ID = '88888888-8888-4888-8888-888888888888';
const CHECKPOINT_ID = '99999999-9999-4999-8999-999999999999';
const RAW_ITEM_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const PROCESSED_ITEM_ID = 'aaaaaaaa-2222-4222-8222-222222222222';
const TIMESTAMP = '2026-10-05T12:00:00.000Z';

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

const UNIT = {
  id: UNIT_ID,
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogram',
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const RAW_PRODUCT = {
  id: RAW_PRODUCT_ID,
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

const PROCESSED_PRODUCT = {
  ...RAW_PRODUCT,
  id: PROCESSED_PRODUCT_ID,
  name: 'Fruit salad',
  kind: 'PROCESSED',
  productionUnitId: UNIT_ID,
};

const PRESENTATION = {
  id: PRESENTATION_ID,
  organizationId: ORGANIZATION_ID,
  productId: PROCESSED_PRODUCT_ID,
  name: 'Bandeja 500 g',
  averageWeightGrams: 500,
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const RAW_ITEM = {
  id: RAW_ITEM_ID,
  organizationId: ORGANIZATION_ID,
  checkpointId: CHECKPOINT_ID,
  productId: RAW_PRODUCT_ID,
  productKind: 'RAW',
  unitId: UNIT_ID,
  quantityMilli: 2_500,
  weightBasis: 'NOT_APPLICABLE',
  sellingPriceAmountMinor: 300,
  sellingPriceBasis: 'PER_SALES_UNIT',
  sellingPriceCurrency: 'USD',
  estimatedSalesValueMinor: 750,
  position: 1,
  createdAt: TIMESTAMP,
};

const PROCESSED_ITEM = {
  id: PROCESSED_ITEM_ID,
  organizationId: ORGANIZATION_ID,
  checkpointId: CHECKPOINT_ID,
  productId: PROCESSED_PRODUCT_ID,
  productKind: 'PROCESSED',
  unitId: UNIT_ID,
  quantityMilli: 1_000,
  presentationId: PRESENTATION_ID,
  trayCount: 2,
  averageWeightPerTrayGrams: 500,
  estimatedWeightGrams: 1_000,
  weightBasis: 'ESTIMATED',
  sellingPriceAmountMinor: 500,
  sellingPriceBasis: 'PER_KILOGRAM',
  sellingPriceCurrency: 'USD',
  estimatedSalesValueMinor: 500,
  position: 2,
  createdAt: TIMESTAMP,
};

const DRAFT_CHECKPOINT = {
  id: CHECKPOINT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  businessDate: '2026-10-05',
  period: 'MORNING',
  status: 'DRAFT',
  registeredByUserId: USER_ID,
  note: 'Morning sales',
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  items: [RAW_ITEM, PROCESSED_ITEM],
};

const CONFIRMED_CHECKPOINT = {
  ...DRAFT_CHECKPOINT,
  status: 'CONFIRMED',
  confirmedByUserId: USER_ID,
  confirmedAt: TIMESTAMP,
};

function salesFixtures(
  checkpoints: readonly unknown[],
  overrides: MockedResponses = {},
): MockedResponses {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/products': { body: { items: [RAW_PRODUCT, PROCESSED_PRODUCT] } },
    'GET /api/v1/measurement-units': { body: { items: [UNIT] } },
    [`GET /api/v1/products/${RAW_PRODUCT_ID}/presentations`]: {
      body: { items: [] },
    },
    [`GET /api/v1/products/${PROCESSED_PRODUCT_ID}/presentations`]: {
      body: { items: [PRESENTATION] },
    },
    'GET /api/v1/sales-checkpoints': { body: { items: checkpoints } },
    ...overrides,
  };
}

async function chooseOption(
  page: import('@playwright/test').Page,
  testId: string,
  name: string | RegExp,
) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name }).click();
}

test.describe('Sales checkpoints', () => {
  test('creates raw and processed lines with snapshotted prices', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    const api = await installApi(
      page,
      salesFixtures([], {
        'POST /api/v1/sales-checkpoints': { status: 201, body: DRAFT_CHECKPOINT },
      }),
    );

    await page.goto('/sales-checkpoints');
    await expect(page.getByText('No sales checkpoints yet.')).toBeVisible();

    await page.getByTestId('sales-checkpoint-new').click();
    await page.locator('#sales-checkpoint-branch').click();
    await page.getByRole('option', { name: 'Central Market' }).click();
    await chooseOption(page, 'sales-checkpoint-product-0', 'Apple');
    await page.getByTestId('sales-checkpoint-quantity-0').fill('2.5');

    await page.getByTestId('sales-checkpoint-add-item').click();
    await chooseOption(page, 'sales-checkpoint-product-1', 'Fruit salad');
    await chooseOption(page, 'sales-checkpoint-presentation-1', /Bandeja 500 g/);
    await page.getByTestId('sales-checkpoint-trays-1').fill('2');
    await page.getByTestId('sales-checkpoint-note').fill('Morning sales');
    await page.getByTestId('sales-checkpoint-create').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      branchId: BRANCH_ID,
      businessDate: '2026-10-05',
      period: 'MORNING',
      note: 'Morning sales',
      items: [
        { productId: RAW_PRODUCT_ID, quantityMilli: 2_500 },
        {
          productId: PROCESSED_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 2,
        },
      ],
    });
    expect(errors).toEqual([]);
  });

  test('confirms a draft through the explicit action', async ({ page }) => {
    const api = await installApi(
      page,
      salesFixtures([DRAFT_CHECKPOINT], {
        [`POST /api/v1/sales-checkpoints/${CHECKPOINT_ID}/confirm`]: {
          body: CONFIRMED_CHECKPOINT,
        },
      }),
    );

    await page.goto('/sales-checkpoints');
    await expect(page.getByTestId(`sales-checkpoint-row-${CHECKPOINT_ID}`)).toContainText('Draft');
    await page.getByTestId(`sales-checkpoint-confirm-${CHECKPOINT_ID}`).click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/confirm')))
      .toHaveLength(1);
  });

  test('corrects a confirmed checkpoint with a required audit reason', async ({ page }) => {
    const api = await installApi(
      page,
      salesFixtures([CONFIRMED_CHECKPOINT], {
        [`POST /api/v1/sales-checkpoints/${CHECKPOINT_ID}/correct`]: {
          body: {
            ...CONFIRMED_CHECKPOINT,
            status: 'CORRECTED',
            correctedByUserId: USER_ID,
            correctedAt: TIMESTAMP,
            correctionReason: 'Trays were mislabelled',
          },
        },
      }),
    );

    await page.goto('/sales-checkpoints');
    await expect(page.getByTestId(`sales-checkpoint-row-${CHECKPOINT_ID}`)).toContainText(
      'Confirmed',
    );
    await page.getByTestId(`sales-checkpoint-correct-${CHECKPOINT_ID}`).click();
    await expect(page.getByText('Correct confirmed checkpoint')).toBeVisible();
    await expect(
      page.getByText(
        'The checkpoint and its stock movements will be fully reversed and kept in the audit history.',
      ),
    ).toBeVisible();
    await page.getByTestId('sales-checkpoint-correction-reason').fill('Trays were mislabelled');
    await page.getByTestId('sales-checkpoint-correction-save').click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/correct')))
      .toHaveLength(1);
    expect(api.recorded.find((row) => row.url.endsWith('/correct'))?.body).toEqual({
      reason: 'Trays were mislabelled',
    });
  });

  test('discards a draft with a delete request', async ({ page }) => {
    const api = await installApi(
      page,
      salesFixtures([DRAFT_CHECKPOINT], {
        [`DELETE /api/v1/sales-checkpoints/${CHECKPOINT_ID}`]: { status: 204, body: null },
      }),
    );

    await page.goto('/sales-checkpoints');
    await expect(page.getByTestId(`sales-checkpoint-row-${CHECKPOINT_ID}`)).toContainText('Draft');
    await page.getByTestId(`sales-checkpoint-discard-${CHECKPOINT_ID}`).click();
    await page.getByTestId('sales-checkpoint-discard-confirm').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'DELETE')).toHaveLength(1);
  });
});
