/**
 * Branch inventory, adjustments and reconciliation, in a real browser.
 *
 * The component tests cover dialogs and failure copy in jsdom. These specs
 * mount `/inventory` in Chromium and assert the derived balance, the movement
 * history and the exact payloads sent for stock operations.
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '66666666-6666-4666-8666-666666666666';
const MOVEMENT_ID = '77777777-7777-4777-8777-777777777777';
const ADJUSTMENT_ID = '88888888-8888-4888-8888-888888888888';
const WASTE_ID = '99999999-9999-4999-8999-999999999999';
const RECONCILIATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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

const PRODUCT = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
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

const BALANCE = {
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityOnHandMilli: 12_500,
  updatedAt: TIMESTAMP,
};

const MOVEMENT = {
  id: MOVEMENT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityDeltaMilli: 12_500,
  reason: 'RECEIVING',
  source: { type: 'PURCHASE_RECEIPT', id: ADJUSTMENT_ID },
  occurredAt: TIMESTAMP,
  recordedAt: TIMESTAMP,
  recordedByUserId: USER_ID,
};

const ADJUSTMENT = {
  id: ADJUSTMENT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  kind: 'MANUAL',
  quantityDeltaMilli: 2_500,
  reason: 'Opening correction',
  occurredAt: TIMESTAMP,
  recordedAt: TIMESTAMP,
  recordedByUserId: USER_ID,
};

const WASTE = {
  id: WASTE_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityMilli: 1_500,
  reason: 'Spoiled bananas',
  occurredAt: TIMESTAMP,
  recordedAt: TIMESTAMP,
  recordedByUserId: USER_ID,
};

const RECONCILIATION = {
  id: RECONCILIATION_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  kind: 'RECONCILIATION',
  quantityDeltaMilli: -2_500,
  expectedQuantityMilli: 12_500,
  countedQuantityMilli: 10_000,
  reason: 'End of day count',
  occurredAt: TIMESTAMP,
  recordedAt: TIMESTAMP,
  recordedByUserId: USER_ID,
};

function inventoryFixtures(overrides: MockedResponses = {}): MockedResponses {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/products': { body: { items: [PRODUCT] } },
    'GET /api/v1/measurement-units': { body: { items: [UNIT] } },
    'GET /api/v1/inventory': { body: { items: [BALANCE] } },
    [`GET /api/v1/inventory/${PRODUCT_ID}/movements`]: { body: { items: [MOVEMENT] } },
    ...overrides,
  };
}

test.describe('Inventory', () => {
  test('shows the derived branch balance and its movement history', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    await installApi(page, inventoryFixtures());

    await page.goto('/inventory');

    const row = page.getByTestId(`stock-row-${PRODUCT_ID}`);
    await expect(row).toContainText('Banana');
    await expect(row).toContainText('12.5');
    await expect(page.getByText('No stock movements yet.')).toBeHidden();

    await page.getByTestId(`stock-history-${PRODUCT_ID}`).click();
    await expect(page.getByTestId('stock-history-row')).toContainText('Receiving');
    await expect(page.getByTestId('stock-history-row')).toContainText('+12.5 kg');

    expect(errors).toEqual([]);
  });

  test('records a manual adjustment with integer thousandths', async ({ page }) => {
    const api = await installApi(
      page,
      inventoryFixtures({
        'POST /api/v1/inventory/adjustments': { status: 201, body: ADJUSTMENT },
      }),
    );

    await page.goto('/inventory');
    await expect(page.getByTestId(`stock-row-${PRODUCT_ID}`)).toContainText('12.5');

    await page.getByTestId(`stock-adjust-${PRODUCT_ID}`).click();
    await page.getByTestId('stock-adjustment-quantity').fill('2,5');
    await page.getByTestId('stock-adjustment-reason').fill('Opening correction');
    await page.getByTestId('stock-adjustment-save').click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/inventory/adjustments')))
      .toHaveLength(1);
    expect(api.recorded.find((row) => row.url.endsWith('/inventory/adjustments'))?.body).toEqual({
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      quantityDeltaMilli: 2_500,
      reason: 'Opening correction',
    });
    await expect(page.getByTestId('stock-adjustment-save')).toBeHidden();
  });

  test('posts the counted quantity for reconciliation', async ({ page }) => {
    const api = await installApi(
      page,
      inventoryFixtures({
        'POST /api/v1/inventory/reconciliations': {
          status: 201,
          body: RECONCILIATION,
        },
      }),
    );

    await page.goto('/inventory');
    await expect(page.getByTestId(`stock-row-${PRODUCT_ID}`)).toContainText('12.5');

    await page.getByTestId(`stock-reconcile-${PRODUCT_ID}`).click();
    await page.getByTestId('stock-reconciliation-counted').fill('10');
    await page.getByTestId('stock-reconciliation-reason').fill('End of day count');
    await page.getByTestId('stock-reconciliation-save').click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/inventory/reconciliations')))
      .toHaveLength(1);
    expect(
      api.recorded.find((row) => row.url.endsWith('/inventory/reconciliations'))?.body,
    ).toEqual({
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      countedQuantityMilli: 10_000,
      reason: 'End of day count',
    });
    await expect(page.getByTestId('stock-reconciliation-save')).toBeHidden();
  });

  test('records waste as a positive quantity', async ({ page }) => {
    const api = await installApi(
      page,
      inventoryFixtures({
        'POST /api/v1/inventory/waste': { status: 201, body: WASTE },
      }),
    );

    await page.goto('/inventory');
    await expect(page.getByTestId(`stock-row-${PRODUCT_ID}`)).toContainText('12.5');

    await page.getByTestId(`stock-waste-${PRODUCT_ID}`).click();
    await page.getByTestId('inventory-waste-quantity').fill('1.5');
    await page.getByTestId('inventory-waste-reason').fill('Spoiled bananas');
    await page.getByTestId('inventory-waste-save').click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/inventory/waste')))
      .toHaveLength(1);
    expect(api.recorded.find((row) => row.url.endsWith('/inventory/waste'))?.body).toEqual({
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      quantityMilli: 1_500,
      reason: 'Spoiled bananas',
    });
    await expect(page.getByTestId('inventory-waste-save')).toBeHidden();
  });
});
