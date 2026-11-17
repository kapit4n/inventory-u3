import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { defaultWebCapabilities, type PlatformCapabilities } from '../../../platform/index.js';
import { PlatformProvider } from '../../../providers.js';
import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { DashboardPage } from './dashboard-page.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const NOW = '2026-11-16T20:00:00.000Z';

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Mercado Central',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const REPORT = {
  range: {
    from: '2026-11-10',
    to: '2026-11-16',
    granularity: 'day',
    timezone: 'UTC',
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
    inventoryProductCount: 3,
  },
  periods: [
    {
      periodStart: '2026-11-16',
      periodEnd: '2026-11-16',
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
      branchName: 'Mercado Central',
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
      productName: 'Manzana Red Delicious',
      productKind: 'RAW',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogramo',
      quantityMilli: 3_000,
      salesTotalMinor: 900,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: -150,
      trayCount: 0,
      estimatedWeightGrams: 0,
      measuredWeightGrams: 0,
    },
  ],
  purchasesBySupplier: [
    {
      supplierId: '33333333-3333-4333-8333-333333333333',
      supplierName: 'Mercado Central de Frutas',
      purchaseCount: 2,
      totalMinor: 1_900,
    },
  ],
  productionByProduct: [
    {
      productId: '66666666-6666-4666-8666-666666666666',
      productName: 'Ensalada de frutas',
      productKind: 'PROCESSED',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogramo',
      batchCount: 1,
      trayCount: 2,
      estimatedWeightGrams: 1_000,
      measuredWeightGrams: 0,
    },
  ],
  wasteByProduct: [
    {
      productId: PRODUCT_ID,
      productName: 'Manzana Red Delicious',
      productKind: 'RAW',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogramo',
      source: 'INVENTORY',
      quantityMilli: 500,
      recordCount: 1,
    },
  ],
  inventoryByProduct: [
    {
      branchId: BRANCH_ID,
      branchName: 'Mercado Central',
      productId: PRODUCT_ID,
      productName: 'Manzana Red Delicious',
      productKind: 'RAW',
      unitId: UNIT_ID,
      unitCode: 'kg',
      unitName: 'Kilogramo',
      quantityMilli: 8_500,
    },
  ],
};

type FetchMock = Mock<typeof fetch>;

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.localStorage.clear();
});

function storeSession(role: 'ADMINISTRATOR' | 'STAFF' = 'ADMINISTRATOR'): void {
  window.localStorage.setItem(
    'inventory-u3-session',
    JSON.stringify({
      token: 'token-123',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: {
        id: USER_ID,
        organizationId: ORGANIZATION_ID,
        email: `${role.toLowerCase()}@inventory.test`,
        fullName: 'Ada Administrator',
        role,
        isActive: true,
      },
    }),
  );
}

function renderPage(
  fetchImplementation: typeof fetch,
  capabilities: PlatformCapabilities = defaultWebCapabilities,
  role: 'ADMINISTRATOR' | 'STAFF' = 'ADMINISTRATOR',
) {
  storeSession(role);
  const client = new ApiClient({
    baseUrl: 'http://api.test/api/v1',
    fetchImplementation,
  });

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiClientProvider baseUrl="http://api.test/api/v1" client={client}>
        <SessionProvider>
          <PlatformProvider capabilities={capabilities}>
            <DashboardPage />
          </PlatformProvider>
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function dashboardApiMock(): FetchMock {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.endsWith('/branches')) {
      return json({ items: [BRANCH] });
    }
    if (url.includes('/reports/summary')) {
      return json(REPORT);
    }
    return json({ error: { code: 'NOT_FOUND', message: 'not found' } }, 404);
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('DashboardPage', () => {
  it('renders the consolidated report and exports it through the platform', async () => {
    const fetchImplementation = dashboardApiMock();
    const saveFile = vi.fn(async (name: string, _contents: string) => name);
    renderPage(fetchImplementation, { ...defaultWebCapabilities, saveFile });

    expect((await screen.findAllByText('$14.00')).length).toBeGreaterThan(0);
    expect(screen.getByText('Mercado Central de Frutas')).toBeInTheDocument();
    expect(screen.getAllByText('Manzana Red Delicious').length).toBeGreaterThan(0);
    expect(screen.getByText(/have no received purchase in a matching unit/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('dashboard-export'));

    await waitFor(() => {
      expect(saveFile).toHaveBeenCalledTimes(1);
    });
    const [name, contents] = saveFile.mock.calls[0]!;
    expect(name).toMatch(/^inventory-report-2026-11-10-2026-11-16-all-branches\.csv$/);
    expect(contents).toContain('Sales by branch');
    expect(contents).toContain('Manzana Red Delicious');
    expect(await screen.findByText(/Report exported as/)).toBeInTheDocument();
  });

  it('refuses the report to a role without reports:read', async () => {
    const fetchImplementation = dashboardApiMock();
    renderPage(fetchImplementation, defaultWebCapabilities, 'STAFF');

    expect(await screen.findByText('Reports access required')).toBeInTheDocument();
    expect(
      fetchImplementation.mock.calls.some(([url]) => String(url).includes('/reports/summary')),
    ).toBe(false);
  });
});
