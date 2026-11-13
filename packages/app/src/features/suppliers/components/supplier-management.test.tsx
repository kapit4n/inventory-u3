import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { SupplierManagement } from './supplier-management.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

const SUPPLIER = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: ORGANIZATION_ID,
  name: 'Central Farms',
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

function renderSuppliers(role: 'ADMINISTRATOR' | 'STAFF', fetchImplementation: typeof fetch) {
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
          <SupplierManagement />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function supplierApiMock(): FetchMock {
  const suppliers = [SUPPLIER];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (init?.method === 'POST' && url.endsWith('/suppliers')) {
      const body = JSON.parse(String(init.body)) as {
        name: string;
        isActive?: boolean;
      };
      const created = {
        ...SUPPLIER,
        id: '55555555-5555-4555-8555-555555555555',
        name: body.name,
        isActive: body.isActive ?? true,
      };
      suppliers.push(created);
      return new Response(JSON.stringify(created), { status: 201 });
    }

    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as {
        name: string;
        isActive: boolean;
      };
      const index = suppliers.findIndex((supplier) => url.endsWith(`/suppliers/${supplier.id}`));
      const existing = index >= 0 ? suppliers[index] : undefined;
      if (!existing) {
        return new Response('{}', { status: 404 });
      }

      const updated = {
        ...existing,
        ...body,
        updatedAt: '2026-11-09T13:00:00.000Z',
      };
      suppliers[index] = updated;
      return new Response(JSON.stringify(updated), { status: 200 });
    }

    if (url.endsWith('/suppliers')) {
      return new Response(JSON.stringify({ items: suppliers }), { status: 200 });
    }

    return new Response('{}', { status: 404 });
  });
}

describe('SupplierManagement', () => {
  it('lists suppliers and lets an administrator create one', async () => {
    const fetchImplementation = supplierApiMock();
    renderSuppliers('ADMINISTRATOR', fetchImplementation);

    expect(await screen.findByText('Central Farms')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('supplier-new'));
    fireEvent.change(screen.getByTestId('supplier-name'), {
      target: { value: 'North Fields' },
    });
    fireEvent.click(screen.getByTestId('supplier-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        'http://api.test/api/v1/suppliers',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'North Fields',
            isActive: true,
          }),
        }),
      );
    });

    expect(await screen.findByText('North Fields')).toBeInTheDocument();
  });

  it('lets an administrator rename and deactivate a supplier', async () => {
    const fetchImplementation = supplierApiMock();
    renderSuppliers('ADMINISTRATOR', fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /edit central farms/i }));
    fireEvent.change(screen.getByTestId('supplier-name'), {
      target: { value: 'Central Farms Produce' },
    });
    fireEvent.pointerDown(screen.getByTestId('supplier-status'), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Inactive' }));
    fireEvent.click(screen.getByTestId('supplier-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/suppliers/${SUPPLIER.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            name: 'Central Farms Produce',
            isActive: false,
          }),
        }),
      );
    });

    expect(await screen.findByText('Central Farms Produce')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the list read-only to a non-administrator', async () => {
    renderSuppliers('STAFF', supplierApiMock());

    expect(await screen.findByText('Central Farms')).toBeInTheDocument();
    expect(screen.queryByTestId('supplier-new')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit central farms/i })).toBeNull();
  });
});
