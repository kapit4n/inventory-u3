/**
 * Typed supplier resource functions.
 *
 * They stay outside React so the application and tests share the same contract
 * and response validation.
 */

import {
  supplierListResponseSchema,
  supplierSchema,
  type CreateSupplierBody,
  type SupplierListResponse,
  type SupplierResponse,
  type UpdateSupplierBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listSuppliers(client: ApiClient): Promise<readonly SupplierResponse[]> {
  const response = await client.get<SupplierListResponse>('/suppliers', {
    schema: supplierListResponseSchema,
  });
  return response.items;
}

export async function createSupplier(
  client: ApiClient,
  body: CreateSupplierBody,
): Promise<SupplierResponse> {
  return client.post<SupplierResponse, CreateSupplierBody>('/suppliers', body, {
    schema: supplierSchema,
  });
}

export async function updateSupplier(
  client: ApiClient,
  supplierId: string,
  body: UpdateSupplierBody,
): Promise<SupplierResponse> {
  return client.put<SupplierResponse, UpdateSupplierBody>(
    `/suppliers/${encodeURIComponent(supplierId)}`,
    body,
    { schema: supplierSchema },
  );
}
