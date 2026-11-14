import { describe, expect, it, vi } from 'vitest';

import {
  cancelPurchase,
  correctPurchase,
  createPurchase,
  getPurchase,
  getPurchaseCorrection,
  listPurchases,
  receivePurchase,
} from './purchases.js';
import { ApiClient, ApiClientError } from './http.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const SUPPLIER_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const PURCHASE_ID = '55555555-5555-4555-8555-555555555555';
const ITEM_ID = '66666666-6666-4666-8666-666666666666';
const PRODUCT_ID = '77777777-7777-4777-8777-777777777777';
const UNIT_ID = '88888888-8888-4888-8888-888888888888';
const CORRECTION_ID = '99999999-9999-4999-8999-999999999999';

const ITEM = {
  id: ITEM_ID,
  organizationId: ORGANIZATION_ID,
  purchaseId: PURCHASE_ID,
  productId: PRODUCT_ID,
  unitId: UNIT_ID,
  quantityMilli: 12_500,
  unitPriceMinor: 350,
  lineTotalMinor: 4_375,
  position: 1,
  createdAt: '2026-11-13T12:00:00.000Z',
};

const PURCHASE = {
  id: PURCHASE_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  supplierId: SUPPLIER_ID,
  status: 'DRAFT',
  deliveryDate: '2026-11-13',
  currency: 'USD',
  totalMinor: 4_375,
  note: 'Morning delivery',
  createdByUserId: USER_ID,
  createdAt: '2026-11-13T12:00:00.000Z',
  updatedAt: '2026-11-13T12:00:00.000Z',
  items: [ITEM],
};

const CORRECTION = {
  id: CORRECTION_ID,
  organizationId: ORGANIZATION_ID,
  purchaseId: PURCHASE_ID,
  correctedByUserId: USER_ID,
  reason: 'Supplier invoice was wrong',
  beforeTotalMinor: 4_375,
  afterTotalMinor: 0,
  correctedAt: '2026-11-13T13:00:00.000Z',
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

describe('purchase API client', () => {
  it('lists purchases, optionally filtered by branch', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [PURCHASE] }));
    const client = clientWith(fetchImpl);

    await expect(listPurchases(client)).resolves.toEqual([PURCHASE]);
    await expect(listPurchases(client, BRANCH_ID)).resolves.toEqual([PURCHASE]);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/purchases?branchId=${BRANCH_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('creates and reads a purchase', async () => {
    const fetchImpl = fetchMock(async (_url, init) =>
      jsonResponse(PURCHASE, init?.method === 'POST' ? 201 : 200),
    );
    const client = clientWith(fetchImpl);

    const body = {
      branchId: BRANCH_ID,
      supplierId: SUPPLIER_ID,
      deliveryDate: '2026-11-13',
      note: 'Morning delivery',
      items: [
        {
          productId: PRODUCT_ID,
          unitId: UNIT_ID,
          quantityMilli: 12_500,
          unitPriceMinor: 350,
        },
      ],
    };

    await expect(createPurchase(client, body)).resolves.toEqual(PURCHASE);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/v1/purchases',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    );

    await expect(getPurchase(client, PURCHASE_ID)).resolves.toEqual(PURCHASE);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/purchases/${PURCHASE_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('receives and cancels through explicit action endpoints', async () => {
    const received = { ...PURCHASE, status: 'RECEIVED' };
    const cancelled = { ...PURCHASE, status: 'CANCELLED' };
    const fetchImpl = fetchMock(async (url) =>
      jsonResponse(url.endsWith('/receive') ? received : cancelled),
    );
    const client = clientWith(fetchImpl);

    await expect(receivePurchase(client, PURCHASE_ID)).resolves.toEqual(received);
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/purchases/${PURCHASE_ID}/receive`,
      expect.objectContaining({ method: 'POST', body: '{}' }),
    );

    await expect(cancelPurchase(client, PURCHASE_ID)).resolves.toEqual(cancelled);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/purchases/${PURCHASE_ID}/cancel`,
      expect.objectContaining({ method: 'POST', body: '{}' }),
    );
  });

  it('records and reads a correction', async () => {
    const corrected = { ...PURCHASE, status: 'CORRECTED' };
    const fetchImpl = fetchMock(async (_url, init) =>
      jsonResponse(
        init?.method === 'POST' ? { purchase: corrected, correction: CORRECTION } : CORRECTION,
      ),
    );
    const client = clientWith(fetchImpl);

    await expect(
      correctPurchase(client, PURCHASE_ID, { reason: 'Supplier invoice was wrong' }),
    ).resolves.toEqual({ purchase: corrected, correction: CORRECTION });
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://api.test/api/v1/purchases/${PURCHASE_ID}/correct`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Supplier invoice was wrong' }),
      }),
    );

    await expect(getPurchaseCorrection(client, PURCHASE_ID)).resolves.toEqual(CORRECTION);
  });

  it('rejects a drifted purchase response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listPurchases(client)).rejects.toBeInstanceOf(ApiClientError);
  });
});
