import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { MeasurementUnitManagement } from './measurement-unit-management.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

const UNIT = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogram',
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

function renderUnits(role: 'ADMINISTRATOR' | 'STAFF', fetchImplementation: typeof fetch) {
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
          <MeasurementUnitManagement />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function unitApiMock(): FetchMock {
  const units = [UNIT];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (init?.method === 'POST' && url.endsWith('/measurement-units')) {
      const body = JSON.parse(String(init.body)) as {
        code: string;
        name: string;
        isActive?: boolean;
      };
      const created = {
        ...UNIT,
        id: '55555555-5555-4555-8555-555555555555',
        code: body.code,
        name: body.name,
        isActive: body.isActive ?? true,
      };
      units.push(created);
      return new Response(JSON.stringify(created), { status: 201 });
    }

    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as {
        code: string;
        name: string;
        isActive: boolean;
      };
      const index = units.findIndex((unit) => url.endsWith(`/measurement-units/${unit.id}`));
      const existing = index >= 0 ? units[index] : undefined;
      if (!existing) {
        return new Response('{}', { status: 404 });
      }

      const updated = {
        ...existing,
        ...body,
        updatedAt: '2026-11-09T13:00:00.000Z',
      };
      units[index] = updated;
      return new Response(JSON.stringify(updated), { status: 200 });
    }

    if (url.endsWith('/measurement-units')) {
      return new Response(JSON.stringify({ items: units }), { status: 200 });
    }

    return new Response('{}', { status: 404 });
  });
}

describe('MeasurementUnitManagement', () => {
  it('lists units with their code and lets an administrator create one', async () => {
    const fetchImplementation = unitApiMock();
    renderUnits('ADMINISTRATOR', fetchImplementation);

    expect(await screen.findByText('Kilogram')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('measurement-unit-new'));
    fireEvent.change(screen.getByTestId('measurement-unit-code'), {
      target: { value: 'tray' },
    });
    fireEvent.change(screen.getByTestId('measurement-unit-name'), {
      target: { value: 'Tray' },
    });
    fireEvent.click(screen.getByTestId('measurement-unit-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        'http://api.test/api/v1/measurement-units',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            code: 'tray',
            name: 'Tray',
            isActive: true,
          }),
        }),
      );
    });

    expect(await screen.findByText('Tray')).toBeInTheDocument();
  });

  it('lets an administrator change the code, name and active state', async () => {
    const fetchImplementation = unitApiMock();
    renderUnits('ADMINISTRATOR', fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /edit kilogram/i }));
    fireEvent.change(screen.getByTestId('measurement-unit-code'), {
      target: { value: 'kilos' },
    });
    fireEvent.change(screen.getByTestId('measurement-unit-name'), {
      target: { value: 'Kilograms' },
    });
    fireEvent.pointerDown(screen.getByTestId('measurement-unit-status'), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Inactive' }));
    fireEvent.click(screen.getByTestId('measurement-unit-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/measurement-units/${UNIT.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            code: 'kilos',
            name: 'Kilograms',
            isActive: false,
          }),
        }),
      );
    });

    expect(await screen.findByText('Kilograms')).toBeInTheDocument();
    expect(screen.getByText('kilos')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the list read-only to a non-administrator', async () => {
    renderUnits('STAFF', unitApiMock());

    expect(await screen.findByText('Kilogram')).toBeInTheDocument();
    expect(screen.queryByTestId('measurement-unit-new')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit kilogram/i })).toBeNull();
  });
});
