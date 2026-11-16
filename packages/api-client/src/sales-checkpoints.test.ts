import { describe, expect, it, vi } from 'vitest';

import {
  confirmSalesCheckpoint,
  correctSalesCheckpoint,
  createSalesCheckpoint,
  discardSalesCheckpoint,
  getSalesCheckpoint,
  listSalesCheckpoints,
} from './sales-checkpoints.js';
import { ApiClient, ApiClientError } from './http.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const RAW_PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const PROCESSED_PRODUCT_ID = '66666666-6666-4666-8666-666666666666';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const PRESENTATION_ID = '88888888-8888-4888-8888-888888888888';
const CHECKPOINT_ID = '99999999-9999-4999-8999-999999999999';
const RAW_ITEM_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const PROCESSED_ITEM_ID = 'aaaaaaaa-2222-4222-8222-222222222222';
const NOW = '2026-11-15T12:00:00.000Z';

const CHECKPOINT = {
  id: CHECKPOINT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  businessDate: '2026-11-15',
  period: 'MORNING',
  status: 'DRAFT',
  registeredByUserId: USER_ID,
  note: 'Morning sales',
  createdAt: NOW,
  updatedAt: NOW,
  items: [
    {
      id: RAW_ITEM_ID,
      organizationId: ORGANIZATION_ID,
      checkpointId: CHECKPOINT_ID,
      productId: RAW_PRODUCT_ID,
      productKind: 'RAW',
      unitId: UNIT_ID,
      quantityMilli: 2_500,
      weightBasis: 'NOT_APPLICABLE',
      sellingPriceAmountMinor: 300,
      sellingPriceBasis: 'PER_SALES_UNIT',
      sellingPriceCurrency: 'USD',
      estimatedSalesValueMinor: 750,
      position: 1,
      createdAt: NOW,
    },
    {
      id: PROCESSED_ITEM_ID,
      organizationId: ORGANIZATION_ID,
      checkpointId: CHECKPOINT_ID,
      productId: PROCESSED_PRODUCT_ID,
      productKind: 'PROCESSED',
      unitId: UNIT_ID,
      quantityMilli: 1_000,
      presentationId: PRESENTATION_ID,
      trayCount: 2,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 1_000,
      weightBasis: 'ESTIMATED',
      sellingPriceAmountMinor: 500,
      sellingPriceBasis: 'PER_KILOGRAM',
      sellingPriceCurrency: 'USD',
      estimatedSalesValueMinor: 500,
      position: 2,
      createdAt: NOW,
    },
  ],
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

describe('sales checkpoint API client', () => {
  it('lists by branch and reads one checkpoint', async () => {
    const fetchImpl = fetchMock(async (url) =>
      jsonResponse(
        url === `http://api.test/api/v1/sales-checkpoints/${CHECKPOINT_ID}`
          ? CHECKPOINT
          : { items: [CHECKPOINT] },
      ),
    );
    const client = clientWith(fetchImpl);

    await expect(listSalesCheckpoints(client, BRANCH_ID)).resolves.toEqual([CHECKPOINT]);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/sales-checkpoints?branchId=${BRANCH_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );

    await expect(getSalesCheckpoint(client, CHECKPOINT_ID)).resolves.toEqual(CHECKPOINT);
  });

  it('creates, confirms and corrects through explicit endpoints', async () => {
    const fetchImpl = fetchMock(async (url) => {
      if (url.endsWith('/confirm')) {
        return jsonResponse({ ...CHECKPOINT, status: 'CONFIRMED', confirmedAt: NOW });
      }
      if (url.endsWith('/correct')) {
        return jsonResponse({
          ...CHECKPOINT,
          status: 'CORRECTED',
          correctionReason: 'Wrong weight',
        });
      }
      return jsonResponse(CHECKPOINT, 201);
    });
    const client = clientWith(fetchImpl);

    const body = {
      branchId: BRANCH_ID,
      businessDate: '2026-11-15',
      period: 'MORNING' as const,
      note: 'Morning sales',
      items: [
        { productId: RAW_PRODUCT_ID, quantityMilli: 2_500 },
        { productId: PROCESSED_PRODUCT_ID, presentationId: PRESENTATION_ID, trayCount: 2 },
      ],
    };
    await expect(createSalesCheckpoint(client, body)).resolves.toEqual(CHECKPOINT);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'http://api.test/api/v1/sales-checkpoints',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    );

    await expect(confirmSalesCheckpoint(client, CHECKPOINT_ID)).resolves.toMatchObject({
      status: 'CONFIRMED',
    });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/sales-checkpoints/${CHECKPOINT_ID}/confirm`,
      expect.objectContaining({ method: 'POST' }),
    );

    await expect(
      correctSalesCheckpoint(client, CHECKPOINT_ID, { reason: 'Wrong weight' }),
    ).resolves.toMatchObject({ status: 'CORRECTED' });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/sales-checkpoints/${CHECKPOINT_ID}/correct`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Wrong weight' }),
      }),
    );
  });

  it('discards a draft with DELETE and rejects a drifted response', async () => {
    const fetchImpl = fetchMock(async (url) => {
      if (url.includes('/sales-checkpoints?')) {
        return jsonResponse({ items: [{ id: 'not-a-uuid' }] });
      }
      return new Response(null, { status: 204 });
    });
    const client = clientWith(fetchImpl);

    await expect(discardSalesCheckpoint(client, CHECKPOINT_ID)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/sales-checkpoints/${CHECKPOINT_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );

    await expect(listSalesCheckpoints(client, BRANCH_ID)).rejects.toBeInstanceOf(ApiClientError);
  });
});
