import { describe, expect, it, vi } from 'vitest';

import { createProductPrice, listProductPrices } from './product-prices.js';
import { ApiClient, ApiClientError } from './http.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const PRICE_ID = '33333333-3333-4333-8333-333333333333';

const PRICE = {
  id: PRICE_ID,
  organizationId: ORGANIZATION_ID,
  productId: PRODUCT_ID,
  amountMinor: 400,
  currency: 'USD',
  priceBasis: 'PER_KILOGRAM',
  effectiveFrom: '2026-11-15',
  createdAt: '2026-11-12T12:00:00.000Z',
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

describe('product price API client', () => {
  it('lists prices with the current organization currency', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [PRICE], currency: 'USD' }));
    const client = clientWith(fetchImpl);

    await expect(listProductPrices(client, PRODUCT_ID)).resolves.toEqual({
      items: [PRICE],
      currency: 'USD',
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/products/${PRODUCT_ID}/prices`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('records a price under the product', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse(PRICE, 201));
    const client = clientWith(fetchImpl);

    await expect(
      createProductPrice(client, PRODUCT_ID, {
        amountMinor: 400,
        effectiveFrom: '2026-11-15',
      }),
    ).resolves.toEqual(PRICE);
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/products/${PRODUCT_ID}/prices`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ amountMinor: 400, effectiveFrom: '2026-11-15' }),
      }),
    );
  });

  it('rejects a drifted price response', async () => {
    const fetchImpl = fetchMock(async () =>
      jsonResponse({ items: [{ id: 'not-a-uuid' }], currency: 'USD' }),
    );
    const client = clientWith(fetchImpl);

    await expect(listProductPrices(client, PRODUCT_ID)).rejects.toBeInstanceOf(ApiClientError);
  });
});
