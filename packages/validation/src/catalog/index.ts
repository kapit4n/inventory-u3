import { z } from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/index.js';

const measurementUnitCodeSchema = z.string().trim().min(1).max(32);
const measurementUnitNameSchema = z.string().trim().min(1).max(80);
const productCategoryNameSchema = z.string().trim().min(1).max(120);
const productPresentationNameSchema = z.string().trim().min(1).max(120);
const averageWeightGramsSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const measurementUnitSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  code: measurementUnitCodeSchema,
  name: measurementUnitNameSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const measurementUnitListResponseSchema = z.object({
  items: z.array(measurementUnitSchema),
});

export const createMeasurementUnitSchema = z.object({
  code: measurementUnitCodeSchema,
  name: measurementUnitNameSchema,
  isActive: z.boolean().optional(),
});

export const updateMeasurementUnitSchema = z.object({
  code: measurementUnitCodeSchema,
  name: measurementUnitNameSchema,
  isActive: z.boolean(),
});

export const measurementUnitIdParamsSchema = z.object({
  measurementUnitId: uuidSchema,
});

export const productCategorySchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: productCategoryNameSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const productCategoryListResponseSchema = z.object({
  items: z.array(productCategorySchema),
});

export const createProductCategorySchema = z.object({
  name: productCategoryNameSchema,
  isActive: z.boolean().optional(),
});

export const updateProductCategorySchema = z.object({
  name: productCategoryNameSchema,
  isActive: z.boolean(),
});

export const productCategoryIdParamsSchema = z.object({
  categoryId: uuidSchema,
});

export const productPresentationSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  productId: uuidSchema,
  name: productPresentationNameSchema,
  averageWeightGrams: averageWeightGramsSchema,
  isActive: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const productPresentationListResponseSchema = z.object({
  items: z.array(productPresentationSchema),
});

export const createProductPresentationSchema = z.object({
  name: productPresentationNameSchema,
  averageWeightGrams: averageWeightGramsSchema,
  isActive: z.boolean().optional(),
});

export const updateProductPresentationSchema = z.object({
  name: productPresentationNameSchema,
  averageWeightGrams: averageWeightGramsSchema,
  isActive: z.boolean(),
});

export const productIdParamsSchema = z.object({
  productId: uuidSchema,
});

export const productPresentationParamsSchema = z.object({
  productId: uuidSchema,
  presentationId: uuidSchema,
});

export type MeasurementUnitResponse = z.infer<typeof measurementUnitSchema>;
export type MeasurementUnitListResponse = z.infer<typeof measurementUnitListResponseSchema>;
export type CreateMeasurementUnitBody = z.infer<typeof createMeasurementUnitSchema>;
export type UpdateMeasurementUnitBody = z.infer<typeof updateMeasurementUnitSchema>;
export type ProductCategoryResponse = z.infer<typeof productCategorySchema>;
export type ProductCategoryListResponse = z.infer<typeof productCategoryListResponseSchema>;
export type CreateProductCategoryBody = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryBody = z.infer<typeof updateProductCategorySchema>;
export type ProductPresentationResponse = z.infer<typeof productPresentationSchema>;
export type ProductPresentationListResponse = z.infer<typeof productPresentationListResponseSchema>;
export type CreateProductPresentationBody = z.infer<typeof createProductPresentationSchema>;
export type UpdateProductPresentationBody = z.infer<typeof updateProductPresentationSchema>;
