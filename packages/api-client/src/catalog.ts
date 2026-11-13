/**
 * Typed catalogue resource functions.
 *
 * Categories and units are organization-wide collections. Presentations are
 * always addressed through their product. The functions stay outside React so
 * the application and tests share the same contract and response validation.
 */

import {
  measurementUnitListResponseSchema,
  measurementUnitSchema,
  productCategoryListResponseSchema,
  productCategorySchema,
  productPresentationListResponseSchema,
  productPresentationSchema,
  type CreateMeasurementUnitBody,
  type CreateProductCategoryBody,
  type CreateProductPresentationBody,
  type MeasurementUnitListResponse,
  type MeasurementUnitResponse,
  type ProductCategoryListResponse,
  type ProductCategoryResponse,
  type ProductPresentationListResponse,
  type ProductPresentationResponse,
  type UpdateMeasurementUnitBody,
  type UpdateProductCategoryBody,
  type UpdateProductPresentationBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listMeasurementUnits(
  client: ApiClient,
): Promise<readonly MeasurementUnitResponse[]> {
  const response = await client.get<MeasurementUnitListResponse>('/measurement-units', {
    schema: measurementUnitListResponseSchema,
  });
  return response.items;
}

export async function createMeasurementUnit(
  client: ApiClient,
  body: CreateMeasurementUnitBody,
): Promise<MeasurementUnitResponse> {
  return client.post<MeasurementUnitResponse, CreateMeasurementUnitBody>(
    '/measurement-units',
    body,
    { schema: measurementUnitSchema },
  );
}

export async function updateMeasurementUnit(
  client: ApiClient,
  measurementUnitId: string,
  body: UpdateMeasurementUnitBody,
): Promise<MeasurementUnitResponse> {
  return client.put<MeasurementUnitResponse, UpdateMeasurementUnitBody>(
    `/measurement-units/${encodeURIComponent(measurementUnitId)}`,
    body,
    { schema: measurementUnitSchema },
  );
}

export async function listProductCategories(
  client: ApiClient,
): Promise<readonly ProductCategoryResponse[]> {
  const response = await client.get<ProductCategoryListResponse>('/product-categories', {
    schema: productCategoryListResponseSchema,
  });
  return response.items;
}

export async function createProductCategory(
  client: ApiClient,
  body: CreateProductCategoryBody,
): Promise<ProductCategoryResponse> {
  return client.post<ProductCategoryResponse, CreateProductCategoryBody>(
    '/product-categories',
    body,
    { schema: productCategorySchema },
  );
}

export async function updateProductCategory(
  client: ApiClient,
  productCategoryId: string,
  body: UpdateProductCategoryBody,
): Promise<ProductCategoryResponse> {
  return client.put<ProductCategoryResponse, UpdateProductCategoryBody>(
    `/product-categories/${encodeURIComponent(productCategoryId)}`,
    body,
    { schema: productCategorySchema },
  );
}

export async function listProductPresentations(
  client: ApiClient,
  productId: string,
): Promise<readonly ProductPresentationResponse[]> {
  const response = await client.get<ProductPresentationListResponse>(
    `/products/${encodeURIComponent(productId)}/presentations`,
    { schema: productPresentationListResponseSchema },
  );
  return response.items;
}

export async function createProductPresentation(
  client: ApiClient,
  productId: string,
  body: CreateProductPresentationBody,
): Promise<ProductPresentationResponse> {
  return client.post<ProductPresentationResponse, CreateProductPresentationBody>(
    `/products/${encodeURIComponent(productId)}/presentations`,
    body,
    { schema: productPresentationSchema },
  );
}

export async function updateProductPresentation(
  client: ApiClient,
  productId: string,
  presentationId: string,
  body: UpdateProductPresentationBody,
): Promise<ProductPresentationResponse> {
  return client.put<ProductPresentationResponse, UpdateProductPresentationBody>(
    `/products/${encodeURIComponent(productId)}/presentations/${encodeURIComponent(presentationId)}`,
    body,
    { schema: productPresentationSchema },
  );
}
