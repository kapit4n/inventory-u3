import { describe, expect, it, vi } from 'vitest';

import {
  confirmProductionBatch,
  correctProductionBatch,
  createProductionBatch,
  discardProductionBatch,
  getProductionBatch,
  listProductionBatches,
} from './production.js';
import { ApiClient, ApiClientError } from './http.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const RAW_PRODUCT_ID = '55555555-5555-4555-8555-555555555555';
const PROCESSED_PRODUCT_ID = '66666666-6666-4666-8666-666666666666';
const UNIT_ID = '77777777-7777-4777-8777-777777777777';
const PRESENTATION_ID = '88888888-8888-4888-8888-888888888888';
const BATCH_ID = '99999999-9999-4999-8999-999999999999';
const INPUT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const OUTPUT_ID = 'aaaaaaaa-2222-4222-8222-222222222222';
const NOW = '2026-11-15T12:00:00.000Z';

const BATCH = {
  id: BATCH_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  businessDate: '2026-11-15',
  preparedByEmployeeId: EMPLOYEE_ID,
  registeredByUserId: USER_ID,
  status: 'DRAFT',
  note: 'Morning trays',
  createdAt: NOW,
  updatedAt: NOW,
  inputs: [
    {
      id: INPUT_ID,
      organizationId: ORGANIZATION_ID,
      batchId: BATCH_ID,
      productId: RAW_PRODUCT_ID,
      unitId: UNIT_ID,
      quantityMilli: 2_500,
      position: 1,
      createdAt: NOW,
    },
  ],
  outputs: [
    {
      id: OUTPUT_ID,
      organizationId: ORGANIZATION_ID,
      batchId: BATCH_ID,
      productId: PROCESSED_PRODUCT_ID,
      presentationId: PRESENTATION_ID,
      trayCount: 2,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 1_000,
      weightBasis: 'ESTIMATED',
      position: 1,
      createdAt: NOW,
    },
  ],
  waste: [],
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

describe('production API client', () => {
  it('lists by branch and reads one batch', async () => {
    const fetchImpl = fetchMock(async (url) =>
      jsonResponse(
        url === `http://api.test/api/v1/production/${BATCH_ID}` ? BATCH : { items: [BATCH] },
      ),
    );
    const client = clientWith(fetchImpl);

    await expect(listProductionBatches(client, BRANCH_ID)).resolves.toEqual([BATCH]);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/production?branchId=${BRANCH_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );

    await expect(getProductionBatch(client, BATCH_ID)).resolves.toEqual(BATCH);
  });

  it('creates, confirms and corrects through explicit endpoints', async () => {
    const fetchImpl = fetchMock(async (url) => {
      if (url.endsWith('/confirm')) {
        return jsonResponse({ ...BATCH, status: 'CONFIRMED', confirmedAt: NOW });
      }
      if (url.endsWith('/correct')) {
        return jsonResponse({ ...BATCH, status: 'CORRECTED', correctionReason: 'Wrong trays' });
      }
      return jsonResponse(BATCH, 201);
    });
    const client = clientWith(fetchImpl);

    const body = {
      branchId: BRANCH_ID,
      businessDate: '2026-11-15',
      preparedByEmployeeId: EMPLOYEE_ID,
      note: 'Morning trays',
      inputs: [{ productId: RAW_PRODUCT_ID, quantityMilli: 2_500 }],
      outputs: [{ productId: PROCESSED_PRODUCT_ID, presentationId: PRESENTATION_ID, trayCount: 2 }],
      waste: [],
    };
    await expect(createProductionBatch(client, body)).resolves.toEqual(BATCH);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'http://api.test/api/v1/production',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }),
    );

    await expect(confirmProductionBatch(client, BATCH_ID)).resolves.toMatchObject({
      status: 'CONFIRMED',
    });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/production/${BATCH_ID}/confirm`,
      expect.objectContaining({ method: 'POST' }),
    );

    await expect(
      correctProductionBatch(client, BATCH_ID, { reason: 'Wrong trays' }),
    ).resolves.toMatchObject({ status: 'CORRECTED' });
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/production/${BATCH_ID}/correct`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reason: 'Wrong trays' }),
      }),
    );
  });

  it('discards a draft with DELETE and rejects a drifted response', async () => {
    const fetchImpl = fetchMock(async (url) => {
      if (url.includes('/production?')) {
        return jsonResponse({ items: [{ id: 'not-a-uuid' }] });
      }
      return new Response(null, { status: 204 });
    });
    const client = clientWith(fetchImpl);

    await expect(discardProductionBatch(client, BATCH_ID)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/production/${BATCH_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );

    await expect(listProductionBatches(client, BRANCH_ID)).rejects.toBeInstanceOf(ApiClientError);
  });
});
