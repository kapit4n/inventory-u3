/**
 * Product management, presentations and price history, in a real browser.
 *
 * These specs mount `/products` in Chromium and drive the dialogs that the
 * component tests cover in jsdom. They assert the requests the page makes, so a
 * broken query path or form wiring fails here even when the component test mock
 * happened to match it.
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';
import { setSessionRole } from './fixtures/session.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const KILOGRAM_ID = '33333333-3333-4333-8333-333333333333';
const TRAY_ID = '44444444-4444-4444-8444-444444444444';
const PROCESSED_ID = '55555555-5555-4555-8555-555555555555';
const RAW_ID = '66666666-6666-4666-8666-666666666666';
const PRESENTATION_ID = '77777777-7777-4777-8777-777777777777';
const PRICE_ID = '88888888-8888-4888-8888-888888888888';
const TIMESTAMP = '2026-11-09T12:00:00.000Z';

const CATEGORY = {
  id: CATEGORY_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Fruit',
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const KILOGRAM = {
  id: KILOGRAM_ID,
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogram',
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const TRAY = {
  id: TRAY_ID,
  organizationId: ORGANIZATION_ID,
  code: 'tray',
  name: 'Tray',
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const PROCESSED_PRODUCT = {
  id: PROCESSED_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: CATEGORY_ID,
  name: 'Watermelon',
  kind: 'PROCESSED',
  inventoryUnitId: KILOGRAM_ID,
  salesUnitId: KILOGRAM_ID,
  productionUnitId: TRAY_ID,
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const RAW_PRODUCT = {
  id: RAW_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: CATEGORY_ID,
  name: 'Banana',
  kind: 'RAW',
  inventoryUnitId: KILOGRAM_ID,
  salesUnitId: KILOGRAM_ID,
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const PRESENTATION = {
  id: PRESENTATION_ID,
  organizationId: ORGANIZATION_ID,
  productId: PROCESSED_ID,
  name: 'Bandeja 500 g',
  averageWeightGrams: 500,
  isActive: true,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const CURRENT_PRICE = {
  id: PRICE_ID,
  organizationId: ORGANIZATION_ID,
  productId: PROCESSED_ID,
  amountMinor: 400,
  currency: 'USD',
  priceBasis: 'PER_KILOGRAM',
  effectiveFrom: '2020-01-01',
  createdAt: TIMESTAMP,
};

const SCHEDULED_PRICE = {
  id: '88888888-8888-4888-8888-888888888889',
  organizationId: ORGANIZATION_ID,
  productId: PROCESSED_ID,
  amountMinor: 450,
  currency: 'USD',
  priceBasis: 'PER_KILOGRAM',
  effectiveFrom: '2030-01-01',
  createdAt: TIMESTAMP,
};

function productFixtures(overrides: MockedResponses = {}): MockedResponses {
  return {
    'GET /api/v1/products': { body: { items: [PROCESSED_PRODUCT, RAW_PRODUCT] } },
    'GET /api/v1/product-categories': { body: { items: [CATEGORY] } },
    'GET /api/v1/measurement-units': { body: { items: [KILOGRAM, TRAY] } },
    'GET /api/v1/products/55555555-5555-4555-8555-555555555555/presentations': {
      body: { items: [PRESENTATION] },
    },
    'GET /api/v1/products/55555555-5555-4555-8555-555555555555/prices': {
      body: { items: [SCHEDULED_PRICE, CURRENT_PRICE], currency: 'USD' },
    },
    'POST /api/v1/products': {
      status: 201,
      body: {
        ...RAW_PRODUCT,
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Cucumber',
      },
    },
    'POST /api/v1/products/55555555-5555-4555-8555-555555555555/presentations': {
      status: 201,
      body: {
        ...PRESENTATION,
        id: '77777777-7777-4777-8777-777777777778',
        name: 'Bandeja 1 kg',
        averageWeightGrams: 1000,
      },
    },
    'POST /api/v1/products/55555555-5555-4555-8555-555555555555/prices': {
      status: 201,
      body: {
        ...CURRENT_PRICE,
        id: '88888888-8888-4888-8888-888888888890',
        amountMinor: 525,
        effectiveFrom: '2030-02-01',
      },
    },
    ...overrides,
  };
}

async function chooseOption(page: import('@playwright/test').Page, testId: string, name: string) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name }).click();
}

test.describe('Products', () => {
  test('lists products and opens their price history', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    await installApi(page, productFixtures());

    await page.goto('/products');

    await expect(page.getByText('Watermelon')).toBeVisible();
    await expect(page.getByText('Banana')).toBeVisible();
    await expect(page.getByText('Fruit')).toHaveCount(2);

    await page.getByRole('button', { name: /prices watermelon/i }).click();

    await expect(page.getByText('Selling prices for Watermelon')).toBeVisible();
    await expect(page.getByText('$4.00')).toBeVisible();
    await expect(page.getByText('$4.50')).toBeVisible();
    await expect(page.getByText('Current', { exact: true })).toBeVisible();
    await expect(page.getByText('Scheduled', { exact: true })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('creates a raw product and edits a processed product', async ({ page }) => {
    const api = await installApi(
      page,
      productFixtures({
        'PUT /api/v1/products/55555555-5555-4555-8555-555555555555': {
          body: { ...PROCESSED_PRODUCT, name: 'Seedless watermelon', isActive: false },
        },
      }),
    );

    await page.goto('/products');

    await page.getByTestId('product-new').click();
    await page.getByTestId('product-name').fill('Cucumber');
    await chooseOption(page, 'product-category', 'Fruit');
    await chooseOption(page, 'product-kind', 'Raw');
    await chooseOption(page, 'product-inventory-unit', 'Kilogram (kg)');
    await chooseOption(page, 'product-sales-unit', 'Kilogram (kg)');
    await page.getByTestId('product-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toMatchObject({
      name: 'Cucumber',
      kind: 'RAW',
      categoryId: CATEGORY_ID,
      inventoryUnitId: KILOGRAM_ID,
      salesUnitId: KILOGRAM_ID,
      isActive: true,
    });

    await page.getByRole('button', { name: /edit watermelon/i }).click();
    await page.getByTestId('product-name').fill('Seedless watermelon');
    await chooseOption(page, 'product-status', 'Inactive');
    await page.getByTestId('product-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'PUT')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'PUT')?.body).toMatchObject({
      name: 'Seedless watermelon',
      kind: 'PROCESSED',
      isActive: false,
    });
  });

  test('creates a tray presentation for a processed product', async ({ page }) => {
    const api = await installApi(page, productFixtures());

    await page.goto('/products');

    await page.getByRole('button', { name: /presentations watermelon/i }).click();
    await expect(page.getByText('Presentations for Watermelon')).toBeVisible();
    await expect(page.getByText('Bandeja 500 g')).toBeVisible();

    await page.getByTestId('product-presentation-new').click();
    await page.getByTestId('product-presentation-name').fill('Bandeja 1 kg');
    await page.getByTestId('product-presentation-weight').fill('1000');
    await page.getByTestId('product-presentation-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      name: 'Bandeja 1 kg',
      averageWeightGrams: 1000,
      isActive: true,
    });
  });

  test('records a new effective-dated selling price', async ({ page }) => {
    const api = await installApi(page, productFixtures());

    await page.goto('/products');

    await page.getByRole('button', { name: /prices watermelon/i }).click();
    await page.getByTestId('product-price-new').click();
    await page.getByTestId('product-price-amount').fill('5.25');
    await page.getByTestId('product-price-effective-from').fill('2030-02-01');
    await page.getByTestId('product-price-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      amountMinor: 525,
      effectiveFrom: '2030-02-01',
    });
  });

  test('shows products read-only to non-administrators but keeps prices visible', async ({
    page,
  }) => {
    await setSessionRole(page, 'STAFF');
    await installApi(page, productFixtures());

    await page.goto('/products');

    await expect(page.getByText('Watermelon')).toBeVisible();
    await expect(page.getByTestId('product-new')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /edit watermelon/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /presentations watermelon/i })).toHaveCount(0);

    await page.getByRole('button', { name: /prices watermelon/i }).click();
    await expect(page.getByText('$4.00')).toBeVisible();
    await expect(page.getByTestId('product-price-new')).toHaveCount(0);
  });
});
