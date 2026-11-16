import {
  productionBatchListResponseSchema,
  productionBatchSchema,
  type CorrectProductionBatchBody,
  type CreateProductionBatchBody,
  type ProductionBatchListResponse,
  type ProductionBatchResponse,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listProductionBatches(
  client: ApiClient,
  branchId?: string,
): Promise<readonly ProductionBatchResponse[]> {
  const response = await client.get<ProductionBatchListResponse>('/production', {
    query: { branchId },
    schema: productionBatchListResponseSchema,
  });
  return response.items;
}

export async function getProductionBatch(
  client: ApiClient,
  batchId: string,
): Promise<ProductionBatchResponse> {
  return client.get<ProductionBatchResponse>(`/production/${encodeURIComponent(batchId)}`, {
    schema: productionBatchSchema,
  });
}

export async function createProductionBatch(
  client: ApiClient,
  body: CreateProductionBatchBody,
): Promise<ProductionBatchResponse> {
  return client.post<ProductionBatchResponse, CreateProductionBatchBody>('/production', body, {
    schema: productionBatchSchema,
  });
}

export async function confirmProductionBatch(
  client: ApiClient,
  batchId: string,
): Promise<ProductionBatchResponse> {
  return client.post<ProductionBatchResponse, Record<string, never>>(
    `/production/${encodeURIComponent(batchId)}/confirm`,
    {},
    { schema: productionBatchSchema },
  );
}

export async function correctProductionBatch(
  client: ApiClient,
  batchId: string,
  body: CorrectProductionBatchBody,
): Promise<ProductionBatchResponse> {
  return client.post<ProductionBatchResponse, CorrectProductionBatchBody>(
    `/production/${encodeURIComponent(batchId)}/correct`,
    body,
    { schema: productionBatchSchema },
  );
}

export async function discardProductionBatch(client: ApiClient, batchId: string): Promise<void> {
  await client.delete<void>(`/production/${encodeURIComponent(batchId)}`);
}
