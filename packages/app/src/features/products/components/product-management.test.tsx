import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { ProductManagement } from './product-management.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const KILOGRAM_ID = '33333333-3333-4333-8333-333333333333';
const PRODUCT_ID = '44444444-4444-4444-8444-444444444444';
const PRICE_ID = '66666666-6666-4666-8666-666666666666';

const CATEGORY = {
  id: CATEGORY_ID,
  organizationId: ORGANIZATION_ID,
  name: 'Fruit',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const KILOGRAM = {
  id: KILOGRAM_ID,
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogram',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const PRODUCT = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: CATEGORY_ID,
  name: 'Watermelon',
  kind: 'PROCESSED',
  inventoryUnitId: KILOGRAM_ID,
  salesUnitId: KILOGRAM_ID,
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const PRICE = {
  id: PRICE_ID,
  organizationId: ORGANIZATION_ID,
  productId: PRODUCT_ID,
  amountMinor: 400,
  currency: 'USD',
  priceBasis: 'PER_KILOGRAM',
  effectiveFrom: '2020-01-01',
  createdAt: '2026-11-09T12:00:00.000Z',
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

function storeSession(role: 'ADMINISTRATOR' | 'STAFF'): void {
  window.localStorage.setItem(
    'inventory-u3-session',
    JSON.stringify({
      token: 'token-123',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: {
        id: '11111111-3333-4444-8555-000000000001',
        organizationId: ORGANIZATION_ID,
        email: 'admin@inventory.test',
        fullName: 'Ada Administrator',
        role,
        isActive: true,
      },
    }),
  );
}

function renderProducts(role: 'ADMINISTRATOR' | 'STAFF', fetchImplementation: typeof fetch) {
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
          <ProductManagement />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function productApiMock(): FetchMock {
  const products = [PRODUCT];
  const prices = [PRICE];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const path = new URL(url).pathname;

    if (path.endsWith(`/products/${PRODUCT_ID}/prices`)) {
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as {
          amountMinor: number;
          effectiveFrom: string;
        };
        const created = {
          ...PRICE,
          id: '77777777-7777-4777-8777-777777777777',
          ...body,
          createdAt: '2026-11-12T12:00:00.000Z',
        };
        prices.push(created);
        return jsonResponse(created, 201);
      }
      return jsonResponse({ items: prices, currency: 'USD' });
    }

    if (init?.method === 'POST' && path.endsWith('/products')) {
      const body = JSON.parse(String(init.body)) as typeof PRODUCT;
      const created = {
        ...PRODUCT,
        ...body,
        id: '55555555-5555-4555-8555-555555555555',
      };
      products.push(created);
      return jsonResponse(created, 201);
    }

    if (init?.method === 'PUT' && path.endsWith(`/products/${PRODUCT_ID}`)) {
      const body = JSON.parse(String(init.body)) as Partial<typeof PRODUCT>;
      const updated = {
        ...PRODUCT,
        ...body,
        updatedAt: '2026-11-09T13:00:00.000Z',
      };
      products[0] = updated;
      return jsonResponse(updated);
    }

    if (path.endsWith('/products')) {
      return jsonResponse({ items: products });
    }
    if (path.endsWith('/product-categories')) {
      return jsonResponse({ items: [CATEGORY] });
    }
    if (path.endsWith('/measurement-units')) {
      return jsonResponse({ items: [KILOGRAM] });
    }

    return jsonResponse({}, 404);
  });
}

async function selectOption(testId: string, optionName: string | RegExp) {
  fireEvent.pointerDown(screen.getByTestId(testId), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
}

describe('ProductManagement', () => {
  it('lists products and lets an administrator create one', async () => {
    const fetchImplementation = productApiMock();
    renderProducts('ADMINISTRATOR', fetchImplementation);

    expect(await screen.findByText('Watermelon')).toBeInTheDocument();
    expect(screen.getByText('Fruit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /presentations watermelon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prices watermelon/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('product-new'));
    fireEvent.change(screen.getByTestId('product-name'), {
      target: { value: 'Pineapple' },
    });
    await selectOption('product-category', 'Fruit');
    await selectOption('product-inventory-unit', /Kilogram/);
    await selectOption('product-sales-unit', /Kilogram/);
    fireEvent.click(screen.getByTestId('product-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        'http://api.test/api/v1/products',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            categoryId: CATEGORY_ID,
            name: 'Pineapple',
            kind: 'PROCESSED',
            inventoryUnitId: KILOGRAM_ID,
            salesUnitId: KILOGRAM_ID,
            isActive: true,
          }),
        }),
      );
    });

    expect(await screen.findByText('Pineapple')).toBeInTheDocument();
  });

  it('lists price history and records a new effective-dated price', async () => {
    const fetchImplementation = productApiMock();
    renderProducts('ADMINISTRATOR', fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /prices watermelon/i }));
    expect(await screen.findByText('Selling prices for Watermelon')).toBeInTheDocument();
    expect(await screen.findByText('$4.00')).toBeInTheDocument();
    expect(screen.getByText('Per kilogram')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('product-price-new'));
    fireEvent.change(await screen.findByTestId('product-price-amount'), {
      target: { value: '5.25' },
    });
    fireEvent.change(screen.getByTestId('product-price-effective-from'), {
      target: { value: '2030-01-01' },
    });
    fireEvent.click(screen.getByTestId('product-price-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/products/${PRODUCT_ID}/prices`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amountMinor: 525, effectiveFrom: '2030-01-01' }),
        }),
      );
    });

    expect(await screen.findByText('$5.25')).toBeInTheDocument();
  });

  it('lets an administrator rename and deactivate a product', async () => {
    const fetchImplementation = productApiMock();
    renderProducts('ADMINISTRATOR', fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /edit watermelon/i }));
    fireEvent.change(screen.getByTestId('product-name'), {
      target: { value: 'Seedless watermelon' },
    });
    await selectOption('product-status', 'Inactive');
    fireEvent.click(screen.getByTestId('product-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/products/${PRODUCT_ID}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            categoryId: CATEGORY_ID,
            name: 'Seedless watermelon',
            kind: 'PROCESSED',
            inventoryUnitId: KILOGRAM_ID,
            salesUnitId: KILOGRAM_ID,
            isActive: false,
          }),
        }),
      );
    });

    expect(await screen.findByText('Seedless watermelon')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the list read-only to a non-administrator', async () => {
    renderProducts('STAFF', productApiMock());

    expect(await screen.findByText('Watermelon')).toBeInTheDocument();
    expect(screen.queryByTestId('product-new')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit watermelon/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /presentations watermelon/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /prices watermelon/i }));
    expect(await screen.findByText('Selling prices for Watermelon')).toBeInTheDocument();
    expect(await screen.findByText('$4.00')).toBeInTheDocument();
    expect(screen.queryByTestId('product-price-new')).toBeNull();
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
