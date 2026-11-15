import { describe, expect, it, vi } from 'vitest';

import {
  adjustStock,
  listStockBalances,
  listStockMovements,
  reconcileStock,
  recordInventoryWaste,
} from './inventory.js';
import { ApiClient, ApiClientError } from './http.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const BRANCH_ID = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';
const MOVEMENT_ID = '55555555-5555-4555-8555-555555555555';
const ADJUSTMENT_ID = '66666666-6666-4666-8666-666666666666';
const WASTE_ID = '77777777-7777-4777-8777-777777777777';
const RECONCILIATION_ID = '88888888-8888-4888-8888-888888888888';
const NOW = '2026-11-15T12:00:00.000Z';

const BALANCE = {
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityOnHandMilli: 7_500,
  updatedAt: NOW,
};

const MOVEMENT = {
  id: MOVEMENT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityDeltaMilli: 10_000,
  reason: 'ADJUSTMENT',
  source: { type: 'ADJUSTMENT', id: ADJUSTMENT_ID },
  occurredAt: NOW,
  recordedAt: NOW,
  recordedByUserId: USER_ID,
};

const ADJUSTMENT = {
  id: ADJUSTMENT_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  kind: 'MANUAL',
  quantityDeltaMilli: 10_000,
  reason: 'Opening stock',
  note: 'First count',
  occurredAt: NOW,
  recordedAt: NOW,
  recordedByUserId: USER_ID,
};

const WASTE = {
  id: WASTE_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  quantityMilli: 2_000,
  reason: 'Damaged in transit',
  occurredAt: NOW,
  recordedAt: NOW,
  recordedByUserId: USER_ID,
};

const RECONCILIATION = {
  id: RECONCILIATION_ID,
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH_ID,
  productId: PRODUCT_ID,
  kind: 'RECONCILIATION',
  quantityDeltaMilli: -500,
  reason: 'Physical count',
  expectedQuantityMilli: 8_000,
  countedQuantityMilli: 7_500,
  occurredAt: NOW,
  recordedAt: NOW,
  recordedByUserId: USER_ID,
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

describe('inventory API client', () => {
  it('lists branch balances and product movements', async () => {
    const fetchImpl = fetchMock(async (url) =>
      jsonResponse({ items: url.includes('/movements') ? [MOVEMENT] : [BALANCE] }),
    );
    const client = clientWith(fetchImpl);

    await expect(listStockBalances(client, BRANCH_ID)).resolves.toEqual([BALANCE]);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/inventory?branchId=${BRANCH_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );

    await expect(listStockMovements(client, PRODUCT_ID, BRANCH_ID)).resolves.toEqual([MOVEMENT]);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      `http://api.test/api/v1/inventory/${PRODUCT_ID}/movements?branchId=${BRANCH_ID}`,
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends adjustments, waste and reconciliations to explicit endpoints', async () => {
    const fetchImpl = fetchMock(async (url) => {
      if (url.endsWith('/waste')) {
        return jsonResponse(WASTE, 201);
      }
      if (url.endsWith('/reconciliations')) {
        return jsonResponse(RECONCILIATION, 201);
      }
      return jsonResponse(ADJUSTMENT, 201);
    });
    const client = clientWith(fetchImpl);

    const adjustmentBody = {
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      quantityDeltaMilli: 10_000,
      reason: 'Opening stock',
      note: 'First count',
    };
    await expect(adjustStock(client, adjustmentBody)).resolves.toEqual(ADJUSTMENT);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'http://api.test/api/v1/inventory/adjustments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(adjustmentBody) }),
    );

    const wasteBody = {
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      quantityMilli: 2_000,
      reason: 'Damaged in transit',
    };
    await expect(recordInventoryWaste(client, wasteBody)).resolves.toEqual(WASTE);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'http://api.test/api/v1/inventory/waste',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(wasteBody) }),
    );

    const reconciliationBody = {
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      countedQuantityMilli: 7_500,
      reason: 'Physical count',
    };
    await expect(reconcileStock(client, reconciliationBody)).resolves.toEqual(RECONCILIATION);
    expect(fetchImpl).toHaveBeenLastCalledWith(
      'http://api.test/api/v1/inventory/reconciliations',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(reconciliationBody) }),
    );
  });

  it('rejects a drifted inventory response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listStockBalances(client, BRANCH_ID)).rejects.toBeInstanceOf(ApiClientError);
  });
});
