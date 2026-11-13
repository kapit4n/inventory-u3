import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError } from './http.js';
import { createSupplier, listSuppliers, updateSupplier } from './suppliers.js';

const SUPPLIER = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: '11111111-1111-4111-8111-111111111111',
  name: 'Central Farms',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

function fetchMock(handler: (url: string, init?: RequestInit) => Promise<Response>): FetchMock {
  return vi.fn(handler as unknown as typeof fetch);
}

function clientWith(fetchImplementation: typeof fetch): ApiClient {
  return new ApiClient({ baseUrl: 'http://api.test/api/v1', fetchImplementation });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('supplier API client', () => {
  it('lists suppliers from the collection envelope', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [SUPPLIER] }));
    const client = clientWith(fetchImpl);

    await expect(listSuppliers(client)).resolves.toEqual([SUPPLIER]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/v1/suppliers');
  });

  it('creates a supplier and validates the returned record', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse(SUPPLIER, 201));
    const client = clientWith(fetchImpl);

    await expect(
      createSupplier(client, {
        name: '  Central Farms  ',
      }),
    ).resolves.toMatchObject({ name: 'Central Farms' });

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"name":"  Central Farms  "}');
  });

  it('updates a supplier under its encoded id', async () => {
    const fetchImpl = fetchMock(async () =>
      jsonResponse({ ...SUPPLIER, name: 'Central Farms Produce', isActive: false }),
    );
    const client = clientWith(fetchImpl);

    await expect(
      updateSupplier(client, SUPPLIER.id, {
        name: 'Central Farms Produce',
        isActive: false,
      }),
    ).resolves.toMatchObject({ name: 'Central Farms Produce', isActive: false });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `http://api.test/api/v1/suppliers/${encodeURIComponent(SUPPLIER.id)}`,
    );
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('PUT');
  });

  it('rejects a drifted supplier response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listSuppliers(client)).rejects.toBeInstanceOf(ApiClientError);
  });
});
