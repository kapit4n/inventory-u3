import {
  salesCheckpointListResponseSchema,
  salesCheckpointSchema,
  type CorrectSalesCheckpointBody,
  type CreateSalesCheckpointBody,
  type SalesCheckpointListResponse,
  type SalesCheckpointResponse,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listSalesCheckpoints(
  client: ApiClient,
  branchId?: string,
): Promise<readonly SalesCheckpointResponse[]> {
  const response = await client.get<SalesCheckpointListResponse>('/sales-checkpoints', {
    query: { branchId },
    schema: salesCheckpointListResponseSchema,
  });
  return response.items;
}

export async function getSalesCheckpoint(
  client: ApiClient,
  checkpointId: string,
): Promise<SalesCheckpointResponse> {
  return client.get<SalesCheckpointResponse>(
    `/sales-checkpoints/${encodeURIComponent(checkpointId)}`,
    { schema: salesCheckpointSchema },
  );
}

export async function createSalesCheckpoint(
  client: ApiClient,
  body: CreateSalesCheckpointBody,
): Promise<SalesCheckpointResponse> {
  return client.post<SalesCheckpointResponse, CreateSalesCheckpointBody>(
    '/sales-checkpoints',
    body,
    { schema: salesCheckpointSchema },
  );
}

export async function confirmSalesCheckpoint(
  client: ApiClient,
  checkpointId: string,
): Promise<SalesCheckpointResponse> {
  return client.post<SalesCheckpointResponse, Record<string, never>>(
    `/sales-checkpoints/${encodeURIComponent(checkpointId)}/confirm`,
    {},
    { schema: salesCheckpointSchema },
  );
}

export async function correctSalesCheckpoint(
  client: ApiClient,
  checkpointId: string,
  body: CorrectSalesCheckpointBody,
): Promise<SalesCheckpointResponse> {
  return client.post<SalesCheckpointResponse, CorrectSalesCheckpointBody>(
    `/sales-checkpoints/${encodeURIComponent(checkpointId)}/correct`,
    body,
    { schema: salesCheckpointSchema },
  );
}

export async function discardSalesCheckpoint(
  client: ApiClient,
  checkpointId: string,
): Promise<void> {
  await client.delete<void>(`/sales-checkpoints/${encodeURIComponent(checkpointId)}`);
}
