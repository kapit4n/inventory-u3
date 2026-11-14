/**
 * Typed product selling-price history functions.
 *
 * The list response also carries the organization's current currency, which is
 * what a new price will be recorded in. Every historical row keeps its own
 * currency so a later organization currency change cannot rewrite history.
 */

import {
  productPriceHistoryListResponseSchema,
  productPriceHistorySchema,
  type CreateProductPriceHistoryBody,
  type ProductPriceHistoryListResponse,
  type ProductPriceHistoryResponse,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listProductPrices(
  client: ApiClient,
  productId: string,
): Promise<ProductPriceHistoryListResponse> {
  return client.get<ProductPriceHistoryListResponse>(
    `/products/${encodeURIComponent(productId)}/prices`,
    { schema: productPriceHistoryListResponseSchema },
  );
}

export async function createProductPrice(
  client: ApiClient,
  productId: string,
  body: CreateProductPriceHistoryBody,
): Promise<ProductPriceHistoryResponse> {
  return client.post<ProductPriceHistoryResponse, CreateProductPriceHistoryBody>(
    `/products/${encodeURIComponent(productId)}/prices`,
    body,
    { schema: productPriceHistorySchema },
  );
}
