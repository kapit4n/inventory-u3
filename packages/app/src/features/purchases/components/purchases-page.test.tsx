import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { todayIsoDate } from '../../products/price-format.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { PurchasesPage } from './purchases-page.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const SUPPLIER_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '66666666-6666-4666-8666-666666666666';
const PURCHASE_ID = '77777777-7777-4777-8777-777777777777';
const CORRECTION_ID = '88888888-8888-4888-8888-888888888888';
const NOW = '2026-11-13T12:00:00.000Z';

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Mercado Central',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const SUPPLIER = {
  id: SUPPLIER_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Central Farms',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const UNIT = {
  id: UNIT_ID,
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogramo',
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const PRODUCT = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: '99999999-9999-4999-8999-999999999999',
  name: 'Banana Ecuador',
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

function renderPurchases(fetchImplementation: typeof fetch) {
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
          <PurchasesPage />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function purchasesApiMock(): FetchMock {
  let purchases: Array<Record<string, unknown>> = [];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

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
    if (url.endsWith('/suppliers')) {
      return json({ items: [SUPPLIER] });
    }
    if (url.endsWith('/products')) {
      return json({ items: [PRODUCT] });
    }
    if (url.endsWith('/measurement-units')) {
      return json({ items: [UNIT] });
    }
    if (init?.method === 'POST' && url.endsWith('/purchases')) {
      const body = JSON.parse(String(init.body)) as {
        branchId: string;
        supplierId: string;
        deliveryDate: string;
        note?: string;
        items: Array<{
          productId: string;
          unitId: string;
          quantityMilli: number;
          unitPriceMinor: number;
        }>;
      };
      const items = body.items.map((item, index) => ({
        id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${index}`,
        organizationId: ORGANIZATION_ID,
        purchaseId: PURCHASE_ID,
        ...item,
        lineTotalMinor: Math.floor((item.quantityMilli * item.unitPriceMinor + 500) / 1000),
        position: index + 1,
        createdAt: NOW,
      }));
      const purchase = {
        id: PURCHASE_ID,
        organizationId: ORGANIZATION_ID,
        branchId: body.branchId,
        supplierId: body.supplierId,
        status: 'DRAFT',
        deliveryDate: body.deliveryDate,
        currency: 'USD',
        totalMinor: items.reduce((total, item) => total + item.lineTotalMinor, 0),
        ...(body.note ? { note: body.note } : {}),
        createdByUserId: USER_ID,
        createdAt: NOW,
        updatedAt: NOW,
        items,
      };
      purchases = [purchase, ...purchases];
      return json(purchase, 201);
    }
    if (init?.method === 'POST' && url.endsWith(`/purchases/${PURCHASE_ID}/receive`)) {
      purchases = purchases.map((purchase) =>
        purchase.id === PURCHASE_ID
          ? {
              ...purchase,
              status: 'RECEIVED',
              receivedByUserId: USER_ID,
              receivedAt: NOW,
              updatedAt: NOW,
            }
          : purchase,
      );
      return json(purchases[0]);
    }
    if (init?.method === 'POST' && url.endsWith(`/purchases/${PURCHASE_ID}/correct`)) {
      purchases = purchases.map((purchase) =>
        purchase.id === PURCHASE_ID
          ? {
              ...purchase,
              status: 'CORRECTED',
              correctedByUserId: USER_ID,
              correctedAt: NOW,
              updatedAt: NOW,
            }
          : purchase,
      );
      return json({
        purchase: purchases[0],
        correction: {
          id: CORRECTION_ID,
          organizationId: ORGANIZATION_ID,
          purchaseId: PURCHASE_ID,
          correctedByUserId: USER_ID,
          reason: 'Supplier invoice was wrong',
          beforeTotalMinor: 4_375,
          afterTotalMinor: 0,
          correctedAt: NOW,
        },
      });
    }
    if (url.endsWith('/purchases')) {
      return json({ items: purchases });
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
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('PurchasesPage', () => {
  it('creates a draft, receives it and corrects it with an audit reason', async () => {
    const fetchImplementation = purchasesApiMock();
    renderPurchases(fetchImplementation);

    expect(await screen.findByText('No purchases yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('purchase-new'));
    await chooseOption(document.getElementById('purchase-branch')!, 'Mercado Central');
    await chooseOption(screen.getByTestId('purchase-supplier'), 'Central Farms');
    await chooseOption(screen.getByTestId('purchase-product-0'), 'Banana Ecuador');
    fireEvent.change(screen.getByTestId('purchase-quantity-0'), { target: { value: '12,5' } });
    fireEvent.change(screen.getByTestId('purchase-unit-price-0'), { target: { value: '3.50' } });
    fireEvent.change(screen.getByTestId('purchase-note'), {
      target: { value: 'Morning delivery' },
    });
    fireEvent.click(screen.getByTestId('purchase-save'));

    await waitFor(() => {
      const post = fetchImplementation.mock.calls.find(
        ([url, init]) =>
          String(url) === 'http://api.test/api/v1/purchases' && init?.method === 'POST',
      );
      expect(post).toBeDefined();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        branchId: BRANCH_ID,
        supplierId: SUPPLIER_ID,
        deliveryDate: todayIsoDate(),
        note: 'Morning delivery',
        items: [
          {
            productId: PRODUCT_ID,
            unitId: UNIT_ID,
            quantityMilli: 12_500,
            unitPriceMinor: 350,
          },
        ],
      });
    });

    expect(await screen.findByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('$43.75')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`purchase-receive-${PURCHASE_ID}`));
    expect(await screen.findByText('Received')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/purchases/${PURCHASE_ID}/receive`,
        expect.objectContaining({ method: 'POST' }),
      );
    });

    fireEvent.click(screen.getByTestId(`purchase-correct-${PURCHASE_ID}`));
    fireEvent.change(screen.getByTestId('purchase-correction-reason'), {
      target: { value: 'Supplier invoice was wrong' },
    });
    fireEvent.click(screen.getByTestId('purchase-correction-save'));

    expect(await screen.findByText('Corrected')).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/purchases/${PURCHASE_ID}/correct`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Supplier invoice was wrong' }),
        }),
      );
    });
  });

  it('requires a product and a valid quantity before sending the purchase', async () => {
    const fetchImplementation = purchasesApiMock();
    renderPurchases(fetchImplementation);

    fireEvent.click(await screen.findByTestId('purchase-new'));
    await chooseOption(document.getElementById('purchase-branch')!, 'Mercado Central');
    await chooseOption(screen.getByTestId('purchase-supplier'), 'Central Farms');
    await chooseOption(screen.getByTestId('purchase-product-0'), 'Banana Ecuador');
    fireEvent.change(screen.getByTestId('purchase-quantity-0'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('purchase-unit-price-0'), { target: { value: '3.50' } });
    fireEvent.click(screen.getByTestId('purchase-save'));

    expect(
      await screen.findByText('Enter a quantity greater than zero with up to 3 decimals.'),
    ).toBeInTheDocument();
    expect(fetchImplementation).not.toHaveBeenCalledWith(
      'http://api.test/api/v1/purchases',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
