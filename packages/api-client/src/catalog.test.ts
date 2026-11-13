import { describe, expect, it, vi } from 'vitest';

import {
  createMeasurementUnit,
  createProductCategory,
  createProductPresentation,
  listMeasurementUnits,
  listProductCategories,
  listProductPresentations,
  updateMeasurementUnit,
  updateProductCategory,
  updateProductPresentation,
} from './catalog.js';
import { ApiClient, ApiClientError } from './http.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';

const UNIT = {
  id: '33333333-3333-4333-8333-333333333333',
  organizationId: ORGANIZATION_ID,
  code: 'kg',
  name: 'Kilogram',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const CATEGORY = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: ORGANIZATION_ID,
  name: 'Fruit',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const PRESENTATION = {
  id: '55555555-5555-4555-8555-555555555555',
  organizationId: ORGANIZATION_ID,
  productId: PRODUCT_ID,
  name: 'Covered tray',
  averageWeightGrams: 500,
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

describe('catalog API client', () => {
  it('lists categories and units from their collection envelopes', async () => {
    const fetchImpl = fetchMock(async (url) =>
      jsonResponse({ items: url.endsWith('/measurement-units') ? [UNIT] : [CATEGORY] }),
    );
    const client = clientWith(fetchImpl);

    await expect(listProductCategories(client)).resolves.toEqual([CATEGORY]);
    await expect(listMeasurementUnits(client)).resolves.toEqual([UNIT]);
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      'http://api.test/api/v1/product-categories',
      'http://api.test/api/v1/measurement-units',
    ]);
  });

  it('creates and updates categories and units under encoded ids', async () => {
    const fetchImpl = fetchMock(async (url, init) => {
      if (init?.method === 'POST') {
        return jsonResponse(url.endsWith('/measurement-units') ? UNIT : CATEGORY, 201);
      }
      return jsonResponse(url.includes('/measurement-units/') ? UNIT : CATEGORY);
    });
    const client = clientWith(fetchImpl);

    await expect(createProductCategory(client, { name: 'Fruit' })).resolves.toEqual(CATEGORY);
    await expect(createMeasurementUnit(client, { code: 'kg', name: 'Kilogram' })).resolves.toEqual(
      UNIT,
    );
    await expect(
      updateProductCategory(client, CATEGORY.id, { name: 'Fruit', isActive: false }),
    ).resolves.toEqual(CATEGORY);
    await expect(
      updateMeasurementUnit(client, UNIT.id, {
        code: 'kg',
        name: 'Kilogram',
        isActive: false,
      }),
    ).resolves.toEqual(UNIT);

    expect(fetchImpl.mock.calls[2]?.[0]).toBe(
      `http://api.test/api/v1/product-categories/${encodeURIComponent(CATEGORY.id)}`,
    );
    expect(fetchImpl.mock.calls[3]?.[0]).toBe(
      `http://api.test/api/v1/measurement-units/${encodeURIComponent(UNIT.id)}`,
    );
    expect(fetchImpl.mock.calls[2]?.[1]?.method).toBe('PUT');
  });

  it('addresses presentations through their product', async () => {
    const fetchImpl = fetchMock(async (_url, init) => {
      if (init?.method === 'POST') {
        return jsonResponse(PRESENTATION, 201);
      }
      if (init?.method === 'PUT') {
        return jsonResponse(PRESENTATION);
      }
      return jsonResponse({ items: [PRESENTATION] });
    });
    const client = clientWith(fetchImpl);

    await expect(listProductPresentations(client, PRODUCT_ID)).resolves.toEqual([PRESENTATION]);
    await expect(
      createProductPresentation(client, PRODUCT_ID, {
        name: 'Covered tray',
        averageWeightGrams: 500,
      }),
    ).resolves.toEqual(PRESENTATION);
    await expect(
      updateProductPresentation(client, PRODUCT_ID, PRESENTATION.id, {
        name: 'Covered tray',
        averageWeightGrams: 500,
        isActive: false,
      }),
    ).resolves.toEqual(PRESENTATION);

    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      `http://api.test/api/v1/products/${PRODUCT_ID}/presentations`,
      `http://api.test/api/v1/products/${PRODUCT_ID}/presentations`,
      `http://api.test/api/v1/products/${PRODUCT_ID}/presentations/${PRESENTATION.id}`,
    ]);
  });

  it('rejects a drifted catalog response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listProductCategories(client)).rejects.toBeInstanceOf(ApiClientError);
  });
});
