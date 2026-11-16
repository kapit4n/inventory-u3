import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { todayIsoDate } from '../../products/price-format.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { SalesCheckpointPage } from './sales-checkpoint-page.js';

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
const NOW = '2026-10-05T12:00:00.000Z';

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Mercado Central',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const RAW_PRODUCT = {
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

const PROCESSED_PRODUCT = {
  ...RAW_PRODUCT,
  id: PROCESSED_PRODUCT_ID,
  name: 'Ensalada de frutas',
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

function renderSales(fetchImplementation: typeof fetch) {
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
          <SalesCheckpointPage />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function checkpointFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: CHECKPOINT_ID,
    organizationId: ORGANIZATION_ID,
    branchId: BRANCH_ID,
    businessDate: todayIsoDate(),
    period: 'MORNING',
    status: 'DRAFT',
    registeredByUserId: USER_ID,
    note: 'Morning sales',
    createdAt: NOW,
    updatedAt: NOW,
    items: [
      {
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
        createdAt: NOW,
      },
      {
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
        createdAt: NOW,
      },
    ],
    ...overrides,
  };
}

function salesApiMock(): FetchMock {
  let checkpoints: Array<Record<string, unknown>> = [];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/organization')) {
      return json({
        id: ORGANIZATION_ID,
        name: 'Inventory Test',
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    if (url.endsWith('/branches')) {
      return json({ items: [BRANCH] });
    }
    if (url.endsWith(`/products/${PROCESSED_PRODUCT_ID}/presentations`)) {
      return json({ items: [PRESENTATION] });
    }
    if (url.endsWith('/products')) {
      return json({ items: [RAW_PRODUCT, PROCESSED_PRODUCT] });
    }
    if (method === 'POST' && url.endsWith('/sales-checkpoints')) {
      const body = JSON.parse(String(init?.body)) as {
        branchId: string;
        businessDate: string;
        period: 'MORNING' | 'EVENING';
        note?: string;
        items: Array<{
          productId: string;
          quantityMilli?: number;
          presentationId?: string;
          trayCount?: number;
        }>;
      };
      const checkpoint = checkpointFixture({
        ...body,
        items: body.items.map((line, index) => {
          const processed = line.productId === PROCESSED_PRODUCT_ID;
          return {
            id: `aaaaaaaa-${processed ? '2222-4222-8222' : '1111-4111-8111'}-00000000000${index}`,
            organizationId: ORGANIZATION_ID,
            checkpointId: CHECKPOINT_ID,
            ...line,
            productKind: processed ? 'PROCESSED' : 'RAW',
            unitId: UNIT_ID,
            quantityMilli: line.quantityMilli ?? (line.trayCount ?? 0) * 500,
            ...(processed
              ? {
                  averageWeightPerTrayGrams: 500,
                  estimatedWeightGrams: (line.trayCount ?? 0) * 500,
                  weightBasis: 'ESTIMATED',
                }
              : { weightBasis: 'NOT_APPLICABLE' }),
            sellingPriceAmountMinor: 300,
            sellingPriceBasis: processed ? 'PER_KILOGRAM' : 'PER_SALES_UNIT',
            sellingPriceCurrency: 'USD',
            estimatedSalesValueMinor: processed ? 500 : 750,
            position: index + 1,
            createdAt: NOW,
          };
        }),
      });
      checkpoints = [checkpoint, ...checkpoints];
      return json(checkpoint, 201);
    }
    if (method === 'POST' && url.endsWith(`/sales-checkpoints/${CHECKPOINT_ID}/confirm`)) {
      checkpoints = checkpoints.map((checkpoint) =>
        checkpoint.id === CHECKPOINT_ID
          ? {
              ...checkpoint,
              status: 'CONFIRMED',
              confirmedByUserId: USER_ID,
              confirmedAt: NOW,
              updatedAt: NOW,
            }
          : checkpoint,
      );
      return json(checkpoints[0]);
    }
    if (method === 'DELETE' && url.endsWith(`/sales-checkpoints/${CHECKPOINT_ID}`)) {
      checkpoints = checkpoints.filter((checkpoint) => checkpoint.id !== CHECKPOINT_ID);
      return new Response(null, { status: 204 });
    }
    if (url.includes('/sales-checkpoints') && !url.includes('/sales-checkpoints/')) {
      const branchId = new URL(url).searchParams.get('branchId');
      return json({
        items:
          branchId === null
            ? checkpoints
            : checkpoints.filter((checkpoint) => checkpoint.branchId === branchId),
      });
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

async function chooseOption(trigger: HTMLElement, optionName: string): Promise<void> {
  fireEvent.pointerDown(trigger, {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
  fireEvent.click(
    await screen.findByRole('option', {
      name: new RegExp(optionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    }),
  );
  await waitFor(() => {
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });
}

describe('SalesCheckpointPage', () => {
  it('creates a raw and processed checkpoint, then confirms it', async () => {
    const fetchImplementation = salesApiMock();
    renderSales(fetchImplementation);

    expect(await screen.findByText('No sales checkpoints yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sales-checkpoint-new'));
    await chooseOption(document.getElementById('sales-checkpoint-branch')!, 'Mercado Central');
    await chooseOption(screen.getByTestId('sales-checkpoint-product-0'), 'Manzana Red Delicious');
    fireEvent.change(screen.getByTestId('sales-checkpoint-quantity-0'), {
      target: { value: '2.5' },
    });

    fireEvent.click(screen.getByTestId('sales-checkpoint-add-item'));
    await chooseOption(screen.getByTestId('sales-checkpoint-product-1'), 'Ensalada de frutas');
    await waitFor(() =>
      expect(screen.getByTestId('sales-checkpoint-presentation-1')).not.toBeDisabled(),
    );
    await chooseOption(screen.getByTestId('sales-checkpoint-presentation-1'), 'Bandeja 500 g');
    fireEvent.change(screen.getByTestId('sales-checkpoint-trays-1'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByTestId('sales-checkpoint-note'), {
      target: { value: 'Morning sales' },
    });
    fireEvent.click(screen.getByTestId('sales-checkpoint-create'));

    await waitFor(() => {
      const post = fetchImplementation.mock.calls.find(
        ([url, init]) =>
          String(url) === 'http://api.test/api/v1/sales-checkpoints' && init?.method === 'POST',
      );
      expect(post).toBeDefined();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        branchId: BRANCH_ID,
        businessDate: todayIsoDate(),
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
    });

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    expect(screen.getByTestId(`sales-checkpoint-row-${CHECKPOINT_ID}`)).toHaveTextContent('$12.50');

    fireEvent.click(screen.getByTestId(`sales-checkpoint-confirm-${CHECKPOINT_ID}`));
    expect(await screen.findByText('Confirmed')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/sales-checkpoints/${CHECKPOINT_ID}/confirm`,
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('discards a draft', async () => {
    const fetchImplementation = salesApiMock();
    renderSales(fetchImplementation);

    fireEvent.click(await screen.findByTestId('sales-checkpoint-new'));
    await chooseOption(document.getElementById('sales-checkpoint-branch')!, 'Mercado Central');
    await chooseOption(screen.getByTestId('sales-checkpoint-product-0'), 'Manzana Red Delicious');
    fireEvent.change(screen.getByTestId('sales-checkpoint-quantity-0'), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByTestId('sales-checkpoint-create'));

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`sales-checkpoint-discard-${CHECKPOINT_ID}`));
    fireEvent.click(screen.getByTestId('sales-checkpoint-discard-confirm'));

    expect(await screen.findByText('No sales checkpoints yet.')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/sales-checkpoints/${CHECKPOINT_ID}`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  it('requires a branch and a product before sending the checkpoint', async () => {
    const fetchImplementation = salesApiMock();
    renderSales(fetchImplementation);

    fireEvent.click(await screen.findByTestId('sales-checkpoint-new'));
    await chooseOption(document.getElementById('sales-checkpoint-branch')!, 'Mercado Central');
    fireEvent.click(screen.getByTestId('sales-checkpoint-create'));

    expect(await screen.findByText('Choose a product for this line.')).toBeInTheDocument();
    expect(fetchImplementation).not.toHaveBeenCalledWith(
      'http://api.test/api/v1/sales-checkpoints',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
