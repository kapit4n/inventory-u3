/**
 * Master-data management, in a real browser.
 *
 * The component tests already exercise the forms against a mocked `fetch`. These
 * specs answer the browser-only questions the component suite cannot: does the
 * `/settings` route mount every management card, do the dialogs open, and does a
 * submit reach the API with the expected payload?
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi, type MockedResponses } from './fixtures/mock-api.js';
import { setSessionRole } from './fixtures/session.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_BRANCH_ID = '22222222-2222-4222-8222-222222222223';
const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const SUPPLIER_ID = '44444444-4444-4444-8444-444444444444';
const CATEGORY_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '66666666-6666-4666-8666-666666666666';
const TIMESTAMP = '2026-11-09T12:00:00.000Z';

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
  fullName: 'Maria Lopez',
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

const CATEGORY = {
  id: CATEGORY_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Fruit',
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

function settingsFixtures(overrides: MockedResponses = {}): MockedResponses {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/employees': { body: { items: [EMPLOYEE] } },
    'GET /api/v1/suppliers': { body: { items: [SUPPLIER] } },
    'GET /api/v1/product-categories': { body: { items: [CATEGORY] } },
    'GET /api/v1/measurement-units': { body: { items: [UNIT] } },
    'POST /api/v1/branches': {
      status: 201,
      body: { ...BRANCH, id: CREATED_BRANCH_ID, name: 'North Market' },
    },
    'POST /api/v1/employees': {
      status: 201,
      body: { ...EMPLOYEE, id: '33333333-3333-4333-8333-333333333334', fullName: 'Ana Alvarez' },
    },
    'POST /api/v1/suppliers': {
      status: 201,
      body: { ...SUPPLIER, id: '44444444-4444-4444-8444-444444444445', name: 'North Fields' },
    },
    'POST /api/v1/product-categories': {
      status: 201,
      body: { ...CATEGORY, id: '55555555-5555-4555-8555-555555555556', name: 'Vegetables' },
    },
    'POST /api/v1/measurement-units': {
      status: 201,
      body: { ...UNIT, id: '66666666-6666-4666-8666-666666666667', code: 'tray', name: 'Tray' },
    },
    ...overrides,
  };
}

async function chooseOption(page: import('@playwright/test').Page, testId: string, name: string) {
  await page.getByTestId(testId).click();
  await page.getByRole('option', { name }).click();
}

test.describe('Master data (settings)', () => {
  test('mounts every management card and lists the stored rows', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    await installApi(page, settingsFixtures());

    await page.goto('/settings');

    await expect(page.getByRole('cell', { name: 'Central Market' }).first()).toBeVisible();
    await expect(page.getByText('Maria Lopez')).toBeVisible();
    await expect(page.getByText('Central Farms')).toBeVisible();
    await expect(page.getByText('Fruit')).toBeVisible();
    await expect(page.getByText('Kilogram')).toBeVisible();
    await expect(page.getByText('kg')).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('creates and edits a branch', async ({ page }) => {
    const api = await installApi(
      page,
      settingsFixtures({
        'PUT /api/v1/branches': {
          body: { ...BRANCH, name: 'Central Market North', isActive: false },
        },
      }),
    );

    await page.goto('/settings');

    await page.getByTestId('branch-new').click();
    await page.getByTestId('branch-name').fill('North Market');
    await page.getByTestId('branch-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      name: 'North Market',
      isActive: true,
    });

    await page.getByRole('button', { name: /edit central market/i }).click();
    await page.getByTestId('branch-name').fill('Central Market North');
    await chooseOption(page, 'branch-status', 'Inactive');
    await page.getByTestId('branch-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'PUT')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'PUT')?.body).toEqual({
      name: 'Central Market North',
      isActive: false,
    });
  });

  test('reports a duplicate branch name instead of a generic failure', async ({ page }) => {
    await installApi(
      page,
      settingsFixtures({
        'POST /api/v1/branches': {
          status: 409,
          body: {
            error: {
              code: 'DOMAIN_RULE_VIOLATION',
              message: 'A branch with that name already exists',
              requestId: 'e2e',
            },
          },
        },
      }),
    );

    await page.goto('/settings');
    await page.getByTestId('branch-new').click();
    await page.getByTestId('branch-name').fill('Central Market');
    await page.getByTestId('branch-save').click();

    await expect(page.getByTestId('branch-form-failure')).toHaveText(
      'A branch with that name already exists.',
    );
  });

  test('creates an employee assigned to a branch', async ({ page }) => {
    const api = await installApi(page, settingsFixtures());

    await page.goto('/settings');
    await page.getByTestId('employee-new').click();
    await page.getByTestId('employee-full-name').fill('Ana Alvarez');
    await page.getByRole('combobox', { name: 'Branch' }).click();
    await page.getByRole('option', { name: 'Central Market' }).click();
    await page.getByTestId('employee-save').click();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);
    expect(api.recorded.find((row) => row.method === 'POST')?.body).toEqual({
      fullName: 'Ana Alvarez',
      branchId: BRANCH_ID,
      isActive: true,
    });
  });

  test('creates suppliers, categories and units', async ({ page }) => {
    const api = await installApi(page, settingsFixtures());

    await page.goto('/settings');

    await page.getByTestId('supplier-new').click();
    await page.getByTestId('supplier-name').fill('North Fields');
    await page.getByTestId('supplier-save').click();
    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(1);

    await page.getByTestId('product-category-new').click();
    await page.getByTestId('product-category-name').fill('Vegetables');
    await page.getByTestId('product-category-save').click();
    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(2);

    await page.getByTestId('measurement-unit-new').click();
    await page.getByTestId('measurement-unit-code').fill('tray');
    await page.getByTestId('measurement-unit-name').fill('Tray');
    await page.getByTestId('measurement-unit-save').click();
    await expect.poll(() => api.recorded.filter((row) => row.method === 'POST')).toHaveLength(3);

    const bodies = api.recorded.filter((row) => row.method === 'POST').map((row) => row.body);
    expect(bodies).toEqual([
      { name: 'North Fields', isActive: true },
      { name: 'Vegetables', isActive: true },
      { code: 'tray', name: 'Tray', isActive: true },
    ]);
  });

  test('shows the lists read-only to non-administrators', async ({ page }) => {
    await setSessionRole(page, 'STAFF');
    await installApi(page, settingsFixtures());

    await page.goto('/settings');

    await expect(page.getByRole('cell', { name: 'Central Market' }).first()).toBeVisible();
    await expect(page.getByText('Maria Lopez')).toBeVisible();
    await expect(page.getByTestId('branch-new')).toHaveCount(0);
    await expect(page.getByTestId('employee-new')).toHaveCount(0);
    await expect(page.getByTestId('supplier-new')).toHaveCount(0);
    await expect(page.getByTestId('product-category-new')).toHaveCount(0);
    await expect(page.getByTestId('measurement-unit-new')).toHaveCount(0);
  });
});
