import { readFile } from 'node:fs/promises';

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi } from './fixtures/mock-api.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const SUPPLIER_ID = '33333333-3333-4333-8333-333333333333';
const PRODUCED_PRODUCT_ID = '66666666-6666-4666-8666-666666666666';
const TIMESTAMP = '2026-10-05T20:00:00.000Z';

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

const REPORT = {
  range: {
    from: '2026-09-29',
    to: '2026-10-05',
    granularity: 'day',
    timezone: 'America/Lima',
  },
  currency: 'USD',
  totals: {
    salesTotalMinor: 1_400,
    purchasesTotalMinor: 1_900,
    estimatedCostMinor: 1_050,
    estimatedGrossProfitMinor: 350,
    missingCostProductCount: 1,
    salesCheckpointCount: 1,
    purchaseCount: 2,
    productionBatchCount: 1,
    productionTrayCount: 2,
    productionEstimatedWeightGrams: 1_000,
    wasteRecordCount: 1,
    inventoryProductCount: 1,
  },
  periods: [
    {
      periodStart: '2026-10-05',
      periodEnd: '2026-10-05',
      salesTotalMinor: 1_400,
      purchasesTotalMinor: 1_900,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: 350,
      salesCheckpointCount: 1,
      purchaseCount: 2,
      productionBatchCount: 1,
      productionTrayCount: 2,
      productionEstimatedWeightGrams: 1_000,
      wasteRecordCount: 1,
    },
  ],
  salesByBranch: [
    {
      branchId: BRANCH_ID,
      branchName: 'Central Market',
      salesTotalMinor: 1_400,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: 350,
      checkpointCount: 1,
      missingCostProductCount: 1,
    },
  ],
  salesByProduct: [
    {
      productId: PRODUCT_ID,
      productName: 'Apple',
      productKind: 'RAW',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogram',
      quantityMilli: 3_000,
      salesTotalMinor: 1_400,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: 350,
      trayCount: 0,
      estimatedWeightGrams: 0,
      measuredWeightGrams: 0,
    },
  ],
  purchasesBySupplier: [
    {
      supplierId: SUPPLIER_ID,
      supplierName: 'Fruit Market',
      purchaseCount: 2,
      totalMinor: 1_900,
    },
  ],
  productionByProduct: [
    {
      productId: PRODUCED_PRODUCT_ID,
      productName: 'Fruit salad',
      productKind: 'PROCESSED',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogram',
      batchCount: 1,
      trayCount: 2,
      estimatedWeightGrams: 1_000,
      measuredWeightGrams: 0,
    },
  ],
  wasteByProduct: [
    {
      productId: PRODUCT_ID,
      productName: 'Apple',
      productKind: 'RAW',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogram',
      source: 'INVENTORY',
      quantityMilli: 500,
      recordCount: 1,
    },
  ],
  inventoryByProduct: [
    {
      branchId: BRANCH_ID,
      branchName: 'Central Market',
      productId: PRODUCT_ID,
      productName: 'Apple',
      productKind: 'RAW',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogram',
      quantityMilli: 8_500,
    },
  ],
};

function reportFixtures(): Record<string, { body: unknown }> {
  return {
    'GET /api/v1/organization': { body: ORGANIZATION },
    'GET /api/v1/branches': { body: { items: [BRANCH] } },
    'GET /api/v1/reports/summary': { body: REPORT },
  };
}

function reportRequest(api: { readonly requests: readonly string[] }) {
  const urls = api.requests
    .map((request) => new URL(request))
    .filter((candidate) => candidate.pathname === '/api/v1/reports/summary');
  const url = urls.at(-1);
  if (!url) {
    throw new Error('The dashboard did not request a report');
  }
  return url;
}

test.use({ timezoneId: 'UTC' });

test.describe('Dashboard report', () => {
  test('renders the consolidated report and exports it as CSV', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    const api = await installApi(page, reportFixtures());

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('$14.00').first()).toBeVisible();
    await expect(page.getByText('Fruit Market')).toBeVisible();
    await expect(page.getByText('Apple').first()).toBeVisible();
    await expect(
      page.getByText('1 product(s) have no received purchase in a matching unit'),
    ).toBeVisible();

    const requested = reportRequest(api);
    expect(requested.searchParams.get('from')).toBe('2026-09-29');
    expect(requested.searchParams.get('to')).toBe('2026-10-05');
    expect(requested.searchParams.get('granularity')).toBe('day');
    expect(requested.searchParams.has('branchId')).toBe(false);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('dashboard-export').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(
      'inventory-report-2026-09-29-2026-10-05-all-branches.csv',
    );
    const path = await download.path();
    if (!path) {
      throw new Error('The CSV download produced no file');
    }
    const contents = await readFile(path, 'utf8');
    expect(contents).toContain('Sales by branch');
    expect(contents).toContain('Fruit Market');
    expect(contents).toContain('14.00');
    await expect(page.getByText(/Report exported as/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('refetches when the period and branch filters change', async ({ page }) => {
    const api = await installApi(page, reportFixtures());

    await page.goto('/dashboard');
    await expect(page.getByText('$14.00').first()).toBeVisible();

    await page.locator('#dashboard-granularity').click();
    await page.getByRole('option', { name: 'Week' }).click();

    await expect.poll(() => reportRequest(api).searchParams.get('granularity')).toBe('week');

    await page.locator('#dashboard-branch').click();
    await page.getByRole('option', { name: 'Central Market' }).click();

    await expect.poll(() => reportRequest(api).searchParams.get('branchId')).toBe(BRANCH_ID);
  });
});
