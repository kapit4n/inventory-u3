import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError } from './http.js';
import { createProduct, listProducts, updateProduct } from './products.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '33333333-3333-4333-8333-333333333333';
const UNIT_ID = '44444444-4444-4444-8444-444444444444';

const PRODUCT = {
  id: PRODUCT_ID,
  organizationId: ORGANIZATION_ID,
  categoryId: CATEGORY_ID,
  name: 'Watermelon',
  kind: 'PROCESSED',
  inventoryUnitId: UNIT_ID,
  salesUnitId: UNIT_ID,
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

describe('product API client', () => {
  it('lists products from the collection envelope', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [PRODUCT] }));
    const client = clientWith(fetchImpl);

    await expect(listProducts(client)).resolves.toEqual([PRODUCT]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/v1/products',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('creates and updates products under an encoded id', async () => {
    const fetchImpl = fetchMock(async (_url, init) =>
      jsonResponse(PRODUCT, init?.method === 'POST' ? 201 : 200),
    );
    const client = clientWith(fetchImpl);

    await expect(
      createProduct(client, {
        categoryId: CATEGORY_ID,
        name: 'Watermelon',
        kind: 'PROCESSED',
        inventoryUnitId: UNIT_ID,
        salesUnitId: UNIT_ID,
      }),
    ).resolves.toEqual(PRODUCT);
    await expect(
      updateProduct(client, PRODUCT_ID, {
        categoryId: CATEGORY_ID,
        name: 'Watermelon',
        kind: 'PROCESSED',
        inventoryUnitId: UNIT_ID,
        salesUnitId: UNIT_ID,
        isActive: false,
      }),
    ).resolves.toEqual(PRODUCT);

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'http://api.test/api/v1/products',
      `http://api.test/api/v1/products/${PRODUCT_ID}`,
    ]);
    expect(fetchImpl.mock.calls[1]?.[1]?.method).toBe('PUT');
  });

  it('rejects a drifted product response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listProducts(client)).rejects.toBeInstanceOf(ApiClientError);
  });
});
