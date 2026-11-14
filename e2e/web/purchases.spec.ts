/**
 * Supplier purchases, receiving and corrections, in a real browser.
 *
 * The component tests cover the form and action wiring in jsdom. These specs
 * mount `/purchases` in Chromium and assert the payloads the page sends for
 * creation, receiving and the audited reversal.
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const SUPPLIER_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '66666666-6666-4666-8666-666666666666';
const PURCHASE_ID = '77777777-7777-4777-8777-777777777777';
const ITEM_ID = '88888888-8888-4888-8888-888888888888';
const CORRECTION_ID = '99999999-9999-4999-8999-999999999999';
const TIMESTAMP = '2026-11-13T12:00:00.000Z';

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

const SUPPLIER = {
  id: SUPPLIER_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Central Farms',
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const PRODUCT = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Banana',
  kind: 'RAW',
  inventoryUnitId: UNIT_ID,
  salesUnitId: UNIT_ID,
  purchaseUnitId: UNIT_ID,
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

const ITEM = {
  id: ITEM_ID,
  organizationId: ORGANIZATION_ID,
  purchaseId: PURCHASE_ID,
  productId: PRODUCT_ID,
  unitId: UNIT_ID,
  quantityMilli: 12_500,
  unitPriceMinor: 350,
  lineTotalMinor: 4_375,
  position: 1,
  createdAt: TIMESTAMP,
};

const DRAFT_PURCHASE = {
  id: PURCHASE_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  supplierId: SUPPLIER_ID,
  status: 'DRAFT',
  deliveryDate: '2026-11-13',
  currency: 'USD',
  totalMinor: 4_375,
  note: 'Morning delivery',
  createdByUserId: USER_ID,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  items: [ITEM],
};

const RECEIVED_PURCHASE = {
  ...DRAFT_PURCHASE,
  status: 'RECEIVED',
  receivedByUserId: USER_ID,
  receivedAt: TIMESTAMP,
};

function purchaseFixtures(
  purchases: readonly unknown[],
  overrides: MockedResponses = {},
): MockedResponses {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/suppliers': { body: { items: [SUPPLIER] } },
    'GET /api/v1/products': { body: { items: [PRODUCT] } },
    'GET /api/v1/measurement-units': { body: { items: [UNIT] } },
    'GET /api/v1/purchases': { body: { items: purchases } },
    ...overrides,
  };
}

async function chooseOption(page: import('@playwright/test').Page, testId: string, name: string) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name }).click();
}

test.describe('Purchases', () => {
  test('creates a multi-line draft with integer thousandths and minor units', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    const api = await installApi(
      page,
      purchaseFixtures([], {
        'POST /api/v1/purchases': { status: 201, body: DRAFT_PURCHASE },
      }),
    );

    await page.goto('/purchases');
    await expect(page.getByText('No purchases yet.')).toBeVisible();

    await page.getByTestId('purchase-new').click();
    await page.getByRole('combobox', { name: 'Branch' }).click();
    await page.getByRole('option', { name: 'Central Market' }).click();
    await chooseOption(page, 'purchase-supplier', 'Central Farms');
    await chooseOption(page, 'purchase-product-0', 'Banana');
    await page.getByTestId('purchase-quantity-0').fill('12,5');
    await page.getByTestId('purchase-unit-price-0').fill('3.50');
    await page.getByTestId('purchase-add-item').click();
    await chooseOption(page, 'purchase-product-1', 'Banana');
    await page.getByTestId('purchase-quantity-1').fill('1.5');
    await page.getByTestId('purchase-unit-price-1').fill('3.33');
    await page.getByTestId('purchase-note').fill('Morning delivery');
    await page.getByTestId('purchase-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      branchId: BRANCH_ID,
      supplierId: SUPPLIER_ID,
      deliveryDate: '2026-10-05',
      note: 'Morning delivery',
      items: [
        {
          productId: PRODUCT_ID,
          unitId: UNIT_ID,
          quantityMilli: 12_500,
          unitPriceMinor: 350,
        },
        {
          productId: PRODUCT_ID,
          unitId: UNIT_ID,
          quantityMilli: 1_500,
          unitPriceMinor: 333,
        },
      ],
    });

    expect(errors).toEqual([]);
  });

  test('receives a draft through the explicit receive action', async ({ page }) => {
    const api = await installApi(
      page,
      purchaseFixtures([DRAFT_PURCHASE], {
        [`POST /api/v1/purchases/${PURCHASE_ID}/receive`]: {
          body: RECEIVED_PURCHASE,
        },
      }),
    );

    await page.goto('/purchases');
    await expect(page.getByText('Draft')).toBeVisible();
    await page.getByTestId(`purchase-receive-${PURCHASE_ID}`).click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/receive')))
      .toHaveLength(1);
  });

  test('corrects a received purchase with a required audit reason', async ({ page }) => {
    const api = await installApi(
      page,
      purchaseFixtures([RECEIVED_PURCHASE], {
        [`POST /api/v1/purchases/${PURCHASE_ID}/correct`]: {
          body: {
            purchase: { ...RECEIVED_PURCHASE, status: 'CORRECTED' },
            correction: {
              id: CORRECTION_ID,
              organizationId: ORGANIZATION_ID,
              purchaseId: PURCHASE_ID,
              correctedByUserId: USER_ID,
              reason: 'Supplier invoice was wrong',
              beforeTotalMinor: 4_375,
              afterTotalMinor: 0,
              correctedAt: TIMESTAMP,
            },
          },
        },
      }),
    );

    await page.goto('/purchases');
    await expect(page.getByText('Received')).toBeVisible();
    await page.getByTestId(`purchase-correct-${PURCHASE_ID}`).click();
    await expect(page.getByText('Correct received purchase')).toBeVisible();
    await expect(page.getByText(/The received purchase of \$43\.75/)).toBeVisible();
    await page.getByTestId('purchase-correction-reason').fill('Supplier invoice was wrong');
    await page.getByTestId('purchase-correction-save').click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/correct')))
      .toHaveLength(1);
    expect(api.recorded.find((row) => row.url.endsWith('/correct'))?.body).toEqual({
      reason: 'Supplier invoice was wrong',
    });
  });
});
