import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { todayIsoDate } from '../../products/price-format.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { DailyClosingPage } from './daily-closing-page.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const RAW_PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const CLOSING_ID = '99999999-9999-4999-8999-999999999999';
const REOPENED_ID = '99999999-9999-4999-8999-000000000002';
const NOW = '2026-11-16T20:00:00.000Z';

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Mercado Central',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const PRODUCT = {
  id: RAW_PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Manzana Red Delicious',
  kind: 'RAW',
  inventoryUnitId: UNIT_ID,
  salesUnitId: UNIT_ID,
  purchaseUnitId: UNIT_ID,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
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

function storeSession(): void {
  window.localStorage.setItem(
    'inventory-u3-session',
    JSON.stringify({
      token: 'token-123',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: {
        id: USER_ID,
        organizationId: ORGANIZATION_ID,
        email: 'admin@inventory.test',
        fullName: 'Ada Administrator',
        role: 'ADMINISTRATOR',
        isActive: true,
      },
    }),
  );
}

function renderPage(fetchImplementation: typeof fetch) {
  storeSession();
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
          <DailyClosingPage />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function closingFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CLOSING_ID,
    organizationId: ORGANIZATION_ID,
    branchId: BRANCH_ID,
    businessDate: todayIsoDate(),
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
    createdAt: NOW,
    updatedAt: NOW,
    items: [
      {
        productId: RAW_PRODUCT_ID,
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
      },
    ],
    ...overrides,
  };
}

function closingApiMock(): FetchMock {
  let closings: Array<Record<string, unknown>> = [];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/branches')) {
      return json({ items: [BRANCH] });
    }
    if (url.endsWith('/products')) {
      return json({ items: [PRODUCT] });
    }
    if (method === 'POST' && url.endsWith('/daily-closings')) {
      const body = JSON.parse(String(init?.body)) as {
        branchId: string;
        businessDate: string;
      };
      const closing = closingFixture({ ...body });
      closings = [closing, ...closings];
      return json(closing, 201);
    }
    if (method === 'POST' && url.endsWith(`/daily-closings/${CLOSING_ID}/review`)) {
      closings = closings.map((closing) =>
        closing.id === CLOSING_ID
          ? {
              ...closing,
              status: 'REVIEWED',
              reviewedByUserId: USER_ID,
              reviewedAt: NOW,
              updatedAt: NOW,
            }
          : closing,
      );
      return json(closings.find((closing) => closing.id === CLOSING_ID));
    }
    if (method === 'POST' && url.endsWith(`/daily-closings/${CLOSING_ID}/confirm`)) {
      closings = closings.map((closing) =>
        closing.id === CLOSING_ID
          ? {
              ...closing,
              status: 'CONFIRMED',
              confirmedByUserId: USER_ID,
              confirmedAt: NOW,
              updatedAt: NOW,
            }
          : closing,
      );
      return json(closings.find((closing) => closing.id === CLOSING_ID));
    }
    if (method === 'POST' && url.endsWith(`/daily-closings/${CLOSING_ID}/reopen`)) {
      const body = JSON.parse(String(init?.body)) as { reason: string };
      const next = closingFixture({
        id: REOPENED_ID,
        version: 2,
        previousClosingId: CLOSING_ID,
        createdAt: NOW,
        updatedAt: NOW,
      });
      closings = closings.map((closing) =>
        closing.id === CLOSING_ID
          ? {
              ...closing,
              status: 'REOPENED',
              reopenedByUserId: USER_ID,
              reopenedAt: NOW,
              reopenReason: body.reason,
              updatedAt: NOW,
            }
          : closing,
      );
      closings = [next, ...closings];
      return json(next);
    }
    if (url.includes('/daily-closings')) {
      return json({ items: closings });
    }

    return json({}, 404);
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('DailyClosingPage', () => {
  it('opens a closing and walks it through review, confirmation and reopening', async () => {
    const fetchImplementation = closingApiMock();
    renderPage(fetchImplementation);

    expect(await screen.findByText('No daily closings for this selection')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('daily-closing-new'));
    fireEvent.click(screen.getByTestId('daily-closing-create-submit'));

    await waitFor(() => {
      const post = fetchImplementation.mock.calls.find(
        ([url, init]) =>
          String(url) === 'http://api.test/api/v1/daily-closings' && init?.method === 'POST',
      );
      expect(post).toBeDefined();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        branchId: BRANCH_ID,
        businessDate: todayIsoDate(),
      });
    });

    expect(await screen.findByText('Daily closing detail')).toBeInTheDocument();
    expect(screen.getAllByText('$9.00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('$10.50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Manzana Red Delicious').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('daily-closing-review'));
    expect((await screen.findAllByText('Reviewed')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('daily-closing-confirm'));
    await waitFor(() => expect(screen.getByTestId('daily-closing-reopen')).toBeInTheDocument());
    expect((await screen.findAllByText('Confirmed')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId('daily-closing-reopen'));
    fireEvent.change(screen.getByTestId('daily-closing-reopen-reason'), {
      target: { value: 'Evening sales arrived late' },
    });
    fireEvent.click(screen.getByTestId('daily-closing-reopen-submit'));

    expect(await screen.findByText('Reopened from version 1')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/daily-closings/${CLOSING_ID}/reopen`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Evening sales arrived late' }),
        }),
      );
    });
  });

  it('requires a reopen reason and surfaces a duplicate creation', async () => {
    const fetchImplementation = closingApiMock();
    renderPage(fetchImplementation);

    expect(await screen.findByText('No daily closings for this selection')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('daily-closing-new'));
    fireEvent.click(screen.getByTestId('daily-closing-create-submit'));
    expect(await screen.findByText('Daily closing detail')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('daily-closing-review'));
    fireEvent.click(await screen.findByTestId('daily-closing-confirm'));
    fireEvent.click(await screen.findByTestId('daily-closing-reopen'));
    fireEvent.click(screen.getByTestId('daily-closing-reopen-submit'));

    await waitFor(() => {
      expect(fetchImplementation).not.toHaveBeenCalledWith(
        `http://api.test/api/v1/daily-closings/${CLOSING_ID}/reopen`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
