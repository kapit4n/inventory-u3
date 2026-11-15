import {
  inventoryWasteSchema,
  stockAdjustmentSchema,
  stockBalanceListResponseSchema,
  stockMovementListResponseSchema,
  type InventoryWasteBody,
  type InventoryWasteResponse,
  type StockAdjustmentBody,
  type StockAdjustmentResponse,
  type StockBalanceListResponse,
  type StockBalanceResponse,
  type StockMovementListResponse,
  type StockMovementResponse,
  type StockReconciliationBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listStockBalances(
  client: ApiClient,
  branchId: string,
): Promise<readonly StockBalanceResponse[]> {
  const response = await client.get<StockBalanceListResponse>('/inventory', {
    query: { branchId },
    schema: stockBalanceListResponseSchema,
  });
  return response.items;
}

export async function listStockMovements(
  client: ApiClient,
  productId: string,
  branchId: string,
): Promise<readonly StockMovementResponse[]> {
  const response = await client.get<StockMovementListResponse>(
    `/inventory/${encodeURIComponent(productId)}/movements`,
    { query: { branchId }, schema: stockMovementListResponseSchema },
  );
  return response.items;
}

export async function adjustStock(
  client: ApiClient,
  body: StockAdjustmentBody,
): Promise<StockAdjustmentResponse> {
  return client.post<StockAdjustmentResponse, StockAdjustmentBody>('/inventory/adjustments', body, {
    schema: stockAdjustmentSchema,
  });
}

export async function recordInventoryWaste(
  client: ApiClient,
  body: InventoryWasteBody,
): Promise<InventoryWasteResponse> {
  return client.post<InventoryWasteResponse, InventoryWasteBody>('/inventory/waste', body, {
    schema: inventoryWasteSchema,
  });
}

export async function reconcileStock(
  client: ApiClient,
  body: StockReconciliationBody,
): Promise<StockAdjustmentResponse> {
  return client.post<StockAdjustmentResponse, StockReconciliationBody>(
    '/inventory/reconciliations',
    body,
    { schema: stockAdjustmentSchema },
  );
}
