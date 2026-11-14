import {
  purchaseCorrectionResultSchema,
  purchaseCorrectionSchema,
  purchaseListResponseSchema,
  purchaseSchema,
  type CorrectPurchaseBody,
  type CreatePurchaseBody,
  type PurchaseCorrectionResponse,
  type PurchaseCorrectionResult,
  type PurchaseListResponse,
  type PurchaseResponse,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listPurchases(
  client: ApiClient,
  branchId?: string,
): Promise<readonly PurchaseResponse[]> {
  const response = await client.get<PurchaseListResponse>('/purchases', {
    query: { branchId },
    schema: purchaseListResponseSchema,
  });
  return response.items;
}

export async function getPurchase(
  client: ApiClient,
  purchaseId: string,
): Promise<PurchaseResponse> {
  return client.get<PurchaseResponse>(`/purchases/${encodeURIComponent(purchaseId)}`, {
    schema: purchaseSchema,
  });
}

export async function createPurchase(
  client: ApiClient,
  body: CreatePurchaseBody,
): Promise<PurchaseResponse> {
  return client.post<PurchaseResponse, CreatePurchaseBody>('/purchases', body, {
    schema: purchaseSchema,
  });
}

export async function receivePurchase(
  client: ApiClient,
  purchaseId: string,
): Promise<PurchaseResponse> {
  return client.post<PurchaseResponse, Record<string, never>>(
    `/purchases/${encodeURIComponent(purchaseId)}/receive`,
    {},
    { schema: purchaseSchema },
  );
}

export async function cancelPurchase(
  client: ApiClient,
  purchaseId: string,
): Promise<PurchaseResponse> {
  return client.post<PurchaseResponse, Record<string, never>>(
    `/purchases/${encodeURIComponent(purchaseId)}/cancel`,
    {},
    { schema: purchaseSchema },
  );
}

export async function correctPurchase(
  client: ApiClient,
  purchaseId: string,
  body: CorrectPurchaseBody,
): Promise<PurchaseCorrectionResult> {
  return client.post<PurchaseCorrectionResult, CorrectPurchaseBody>(
    `/purchases/${encodeURIComponent(purchaseId)}/correct`,
    body,
    { schema: purchaseCorrectionResultSchema },
  );
}

export async function getPurchaseCorrection(
  client: ApiClient,
  purchaseId: string,
): Promise<PurchaseCorrectionResponse> {
  return client.get<PurchaseCorrectionResponse>(
    `/purchases/${encodeURIComponent(purchaseId)}/correction`,
    { schema: purchaseCorrectionSchema },
  );
}
