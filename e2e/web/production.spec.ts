/**
 * Branch production, in a real browser.
 *
 * The component tests cover the form in jsdom. These specs mount `/production`
 * in Chromium and assert the payloads for creation, confirmation, correction
 * and draft discard.
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const RAW_PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const PROCESSED_PRODUCT_ID = '66666666-6666-4666-8666-666666666666';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const PRESENTATION_ID = '88888888-8888-4888-8888-888888888888';
const BATCH_ID = '99999999-9999-4999-8999-999999999999';
const INPUT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const OUTPUT_ID = 'aaaaaaaa-2222-4222-8222-222222222222';
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

const EMPLOYEE = {
  id: EMPLOYEE_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  fullName: 'Lucía Fernández',
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

const INPUT = {
  id: INPUT_ID,
  organizationId: ORGANIZATION_ID,
  batchId: BATCH_ID,
  productId: RAW_PRODUCT_ID,
  unitId: UNIT_ID,
  quantityMilli: 2_500,
  position: 1,
  createdAt: TIMESTAMP,
};

const OUTPUT = {
  id: OUTPUT_ID,
  organizationId: ORGANIZATION_ID,
  batchId: BATCH_ID,
  productId: PROCESSED_PRODUCT_ID,
  presentationId: PRESENTATION_ID,
  trayCount: 2,
  averageWeightPerTrayGrams: 500,
  estimatedWeightGrams: 1_000,
  weightBasis: 'ESTIMATED',
  position: 1,
  createdAt: TIMESTAMP,
};

const DRAFT_BATCH = {
  id: BATCH_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  businessDate: '2026-10-05',
  preparedByEmployeeId: EMPLOYEE_ID,
  registeredByUserId: USER_ID,
  status: 'DRAFT',
  note: 'Morning trays',
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  inputs: [INPUT],
  outputs: [OUTPUT],
  waste: [],
};

const CONFIRMED_BATCH = {
  ...DRAFT_BATCH,
  status: 'CONFIRMED',
  confirmedByUserId: USER_ID,
  confirmedAt: TIMESTAMP,
};

function productionFixtures(
  batches: readonly unknown[],
  overrides: MockedResponses = {},
): MockedResponses {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/employees': { body: { items: [EMPLOYEE] } },
    'GET /api/v1/products': { body: { items: [RAW_PRODUCT, PROCESSED_PRODUCT] } },
    'GET /api/v1/measurement-units': { body: { items: [UNIT] } },
    [`GET /api/v1/products/${PROCESSED_PRODUCT_ID}/presentations`]: {
      body: { items: [PRESENTATION] },
    },
    'GET /api/v1/production': { body: { items: batches } },
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

test.describe('Production', () => {
  test('creates an output-only batch with estimated tray weight', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    const api = await installApi(
      page,
      productionFixtures([], {
        'POST /api/v1/production': { status: 201, body: DRAFT_BATCH },
      }),
    );

    await page.goto('/production');
    await expect(page.getByText('No production batches yet.')).toBeVisible();

    await page.getByTestId('production-new').click();
    await page.locator('#production-branch').click();
    await page.getByRole('option', { name: 'Central Market' }).click();
    await chooseOption(page, 'production-preparer', 'Lucía Fernández');
    await chooseOption(page, 'production-output-product-0', 'Fruit salad');
    await chooseOption(page, 'production-output-presentation-0', /Bandeja 500 g/);
    await page.getByTestId('production-output-trays-0').fill('2');
    await page.getByTestId('production-note').fill('Morning trays');
    await page.getByTestId('production-create').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      branchId: BRANCH_ID,
      businessDate: '2026-10-05',
      preparedByEmployeeId: EMPLOYEE_ID,
      note: 'Morning trays',
      inputs: [],
      outputs: [
        {
          productId: PROCESSED_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 2,
        },
      ],
      waste: [],
    });
    expect(errors).toEqual([]);
  });

  test('confirms a draft through the explicit action', async ({ page }) => {
    const api = await installApi(
      page,
      productionFixtures([DRAFT_BATCH], {
        [`POST /api/v1/production/${BATCH_ID}/confirm`]: { body: CONFIRMED_BATCH },
      }),
    );

    await page.goto('/production');
    await expect(page.getByTestId(`production-row-${BATCH_ID}`)).toContainText('Draft');
    await page.getByTestId(`production-confirm-${BATCH_ID}`).click();

    await expect
      .poll(() => api.recorded.filter((row) => row.url.endsWith('/confirm')))
      .toHaveLength(1);
  });

  test('corrects a confirmed batch with a required audit reason', async ({ page }) => {
    const api = await installApi(
      page,
      productionFixtures([CONFIRMED_BATCH], {
        [`POST /api/v1/production/${BATCH_ID}/correct`]: {
          body: {
            ...CONFIRMED_BATCH,
            status: 'CORRECTED',
            correctedByUserId: USER_ID,
            correctedAt: TIMESTAMP,
            correctionReason: 'Trays were mislabelled',
          },
        },
      }),
    );

    await page.goto('/production');
    await expect(page.getByTestId(`production-row-${BATCH_ID}`)).toContainText('Confirmed');
    await page.getByTestId(`production-correct-${BATCH_ID}`).click();
    await expect(page.getByText('Correct confirmed batch')).toBeVisible();
    await expect(
      page.getByText(
        'The batch and its stock movements will be fully reversed and kept in the audit history.',
      ),
    ).toBeVisible();
    await page.getByTestId('production-correction-reason').fill('Trays were mislabelled');
    await page.getByTestId('production-correction-save').click();

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
      productionFixtures([DRAFT_BATCH], {
        [`DELETE /api/v1/production/${BATCH_ID}`]: { status: 204, body: null },
      }),
    );

    await page.goto('/production');
    await expect(page.getByTestId(`production-row-${BATCH_ID}`)).toContainText('Draft');
    await page.getByTestId(`production-discard-${BATCH_ID}`).click();
    await page.getByTestId('production-discard-confirm').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'DELETE')).toHaveLength(1);
  });
});
