import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { InventoryPage } from './inventory-page.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const UNIT_ID = '66666666-6666-4666-8666-666666666666';
const MOVEMENT_ID = '77777777-7777-4777-8777-777777777777';
const ADJUSTMENT_ID = '88888888-8888-4888-8888-888888888888';
const NOW = '2026-11-15T12:00:00.000Z';

const BRANCH = {
  id: BRANCH_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Mercado Central',
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

const BALANCE = {
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityOnHandMilli: 12_500,
  updatedAt: NOW,
};

const MOVEMENT = {
  id: MOVEMENT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityDeltaMilli: 12_500,
  reason: 'RECEIVING',
  source: { type: 'PURCHASE_RECEIPT', id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  occurredAt: NOW,
  recordedAt: NOW,
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
  occurredAt: NOW,
  recordedAt: NOW,
  recordedByUserId: USER_ID,
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

function renderInventory(fetchImplementation: typeof fetch) {
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
          <InventoryPage />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function inventoryApiMock(): FetchMock {
  let balances = [BALANCE];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (url.endsWith('/branches')) {
      return json({ items: [BRANCH] });
    }
    if (url.endsWith('/products')) {
      return json({ items: [PRODUCT] });
    }
    if (url.endsWith('/measurement-units')) {
      return json({ items: [UNIT] });
    }
    if (init?.method === 'POST' && url.endsWith('/inventory/adjustments')) {
      const body = JSON.parse(String(init.body)) as { quantityDeltaMilli: number };
      balances = [{ ...BALANCE, quantityOnHandMilli: 12_500 + body.quantityDeltaMilli }];
      return json(ADJUSTMENT, 201);
    }
    if (init?.method === 'POST' && url.endsWith('/inventory/waste')) {
      return json(
        {
          error: {
            code: 'DOMAIN_RULE_VIOLATION',
            message: 'The operation would leave negative stock',
            details: { currentQuantityMilli: 12_500, resultingQuantityMilli: -7_500 },
            requestId: 'req-1',
          },
        },
        409,
      );
    }
    if (url.includes('/movements')) {
      return json({ items: [MOVEMENT] });
    }
    if (url.includes('/inventory?')) {
      return json({ items: balances });
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

describe('InventoryPage', () => {
  it('shows the derived balance and the product movement history', async () => {
    const fetchImplementation = inventoryApiMock();
    renderInventory(fetchImplementation);

    const row = await screen.findByTestId(`stock-row-${PRODUCT_ID}`);
    expect(await within(row).findByText('12.5')).toBeInTheDocument();
    expect(screen.queryByText('No stock movements yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`stock-history-${PRODUCT_ID}`));

    expect(await screen.findByText('Receiving')).toBeInTheDocument();
    expect(screen.getByText('+12.5 kg')).toBeInTheDocument();
    expect(fetchImplementation).toHaveBeenCalledWith(
      `http://api.test/api/v1/inventory/${PRODUCT_ID}/movements?branchId=${BRANCH_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('records an adjustment and refreshes the balance', async () => {
    const fetchImplementation = inventoryApiMock();
    renderInventory(fetchImplementation);

    fireEvent.click(await screen.findByTestId(`stock-adjust-${PRODUCT_ID}`));
    fireEvent.change(screen.getByTestId('stock-adjustment-quantity'), {
      target: { value: '2,5' },
    });
    fireEvent.change(screen.getByTestId('stock-adjustment-reason'), {
      target: { value: 'Opening correction' },
    });
    fireEvent.click(screen.getByTestId('stock-adjustment-save'));

    await waitFor(() => {
      const post = fetchImplementation.mock.calls.find(
        ([url, init]) =>
          String(url) === 'http://api.test/api/v1/inventory/adjustments' && init?.method === 'POST',
      );
      expect(post).toBeDefined();
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({
        branchId: BRANCH_ID,
        productId: PRODUCT_ID,
        quantityDeltaMilli: 2_500,
        reason: 'Opening correction',
      });
    });

    const row = screen.getByTestId(`stock-row-${PRODUCT_ID}`);
    expect(await within(row).findByText('15')).toBeInTheDocument();
  });

  it('explains a refused operation that would leave negative stock', async () => {
    const fetchImplementation = inventoryApiMock();
    renderInventory(fetchImplementation);

    fireEvent.click(await screen.findByTestId(`stock-waste-${PRODUCT_ID}`));
    fireEvent.change(screen.getByTestId('inventory-waste-quantity'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByTestId('inventory-waste-reason'), {
      target: { value: 'Too much waste' },
    });
    fireEvent.click(screen.getByTestId('inventory-waste-save'));

    expect(
      await screen.findByText(
        'The operation was refused because it would leave negative stock or the record is inactive.',
      ),
    ).toBeInTheDocument();
  });
});
