import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { ProductCategoryManagement } from './product-category-management.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

const CATEGORY = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: ORGANIZATION_ID,
  name: 'Fruit',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
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

function renderCategories(role: 'ADMINISTRATOR' | 'STAFF', fetchImplementation: typeof fetch) {
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
          <ProductCategoryManagement />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function categoryApiMock(): FetchMock {
  const categories = [CATEGORY];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (init?.method === 'POST' && url.endsWith('/product-categories')) {
      const body = JSON.parse(String(init.body)) as {
        name: string;
        isActive?: boolean;
      };
      const created = {
        ...CATEGORY,
        id: '55555555-5555-4555-8555-555555555555',
        name: body.name,
        isActive: body.isActive ?? true,
      };
      categories.push(created);
      return new Response(JSON.stringify(created), { status: 201 });
    }

    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as {
        name: string;
        isActive: boolean;
      };
      const index = categories.findIndex((category) =>
        url.endsWith(`/product-categories/${category.id}`),
      );
      const existing = index >= 0 ? categories[index] : undefined;
      if (!existing) {
        return new Response('{}', { status: 404 });
      }

      const updated = {
        ...existing,
        ...body,
        updatedAt: '2026-11-09T13:00:00.000Z',
      };
      categories[index] = updated;
      return new Response(JSON.stringify(updated), { status: 200 });
    }

    if (url.endsWith('/product-categories')) {
      return new Response(JSON.stringify({ items: categories }), { status: 200 });
    }

    return new Response('{}', { status: 404 });
  });
}

describe('ProductCategoryManagement', () => {
  it('lists categories and lets an administrator create one', async () => {
    const fetchImplementation = categoryApiMock();
    renderCategories('ADMINISTRATOR', fetchImplementation);

    expect(await screen.findByText('Fruit')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('product-category-new'));
    fireEvent.change(screen.getByTestId('product-category-name'), {
      target: { value: 'Vegetables' },
    });
    fireEvent.click(screen.getByTestId('product-category-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        'http://api.test/api/v1/product-categories',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Vegetables',
            isActive: true,
          }),
        }),
      );
    });

    expect(await screen.findByText('Vegetables')).toBeInTheDocument();
  });

  it('lets an administrator rename and deactivate a category', async () => {
    const fetchImplementation = categoryApiMock();
    renderCategories('ADMINISTRATOR', fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /edit fruit/i }));
    fireEvent.change(screen.getByTestId('product-category-name'), {
      target: { value: 'Fresh fruit' },
    });
    fireEvent.pointerDown(screen.getByTestId('product-category-status'), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Inactive' }));
    fireEvent.click(screen.getByTestId('product-category-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/product-categories/${CATEGORY.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Fresh fruit',
            isActive: false,
          }),
        }),
      );
    });

    expect(await screen.findByText('Fresh fruit')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the list read-only to a non-administrator', async () => {
    renderCategories('STAFF', categoryApiMock());

    expect(await screen.findByText('Fruit')).toBeInTheDocument();
    expect(screen.queryByTestId('product-category-new')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit fruit/i })).toBeNull();
  });
});
