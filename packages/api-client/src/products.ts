/**
 * Typed product resource functions.
 *
 * Products are organization-wide catalogue rows. The functions stay outside
 * React so the application and tests share the same contract and response
 * validation.
 */

import {
  productListResponseSchema,
  productSchema,
  type CreateProductBody,
  type ProductListResponse,
  type ProductResponse,
  type UpdateProductBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listProducts(client: ApiClient): Promise<readonly ProductResponse[]> {
  const response = await client.get<ProductListResponse>('/products', {
    schema: productListResponseSchema,
  });
  return response.items;
}

export async function createProduct(
  client: ApiClient,
  body: CreateProductBody,
): Promise<ProductResponse> {
  return client.post<ProductResponse, CreateProductBody>('/products', body, {
    schema: productSchema,
  });
}

export async function updateProduct(
  client: ApiClient,
  productId: string,
  body: UpdateProductBody,
): Promise<ProductResponse> {
  return client.put<ProductResponse, UpdateProductBody>(
    `/products/${encodeURIComponent(productId)}`,
    body,
    { schema: productSchema },
  );
}
