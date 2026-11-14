import { z } from 'zod';

import { isoDateSchema, isoDateTimeSchema, uuidSchema } from '../common/index.js';

export const purchaseStatusSchema = z.enum(['DRAFT', 'RECEIVED', 'CANCELLED', 'CORRECTED']);

const quantityMilliSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const unitPriceMinorSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const noteSchema = z.string().trim().min(1).max(500);

export const purchaseItemSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  purchaseId: uuidSchema,
  productId: uuidSchema,
  unitId: uuidSchema,
  quantityMilli: quantityMilliSchema,
  unitPriceMinor: unitPriceMinorSchema,
  lineTotalMinor: unitPriceMinorSchema,
  position: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
});

export const purchaseSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  supplierId: uuidSchema,
  status: purchaseStatusSchema,
  deliveryDate: isoDateSchema,
  currency: z.string().length(3),
  totalMinor: unitPriceMinorSchema,
  note: noteSchema.optional(),
  createdByUserId: uuidSchema,
  receivedByUserId: uuidSchema.optional(),
  receivedAt: isoDateTimeSchema.optional(),
  cancelledAt: isoDateTimeSchema.optional(),
  correctedByUserId: uuidSchema.optional(),
  correctedAt: isoDateTimeSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  items: z.array(purchaseItemSchema).min(1),
});

export const purchaseCorrectionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  purchaseId: uuidSchema,
  correctedByUserId: uuidSchema,
  reason: z.string().min(1).max(500),
  beforeTotalMinor: unitPriceMinorSchema,
  afterTotalMinor: unitPriceMinorSchema,
  correctedAt: isoDateTimeSchema,
});

export const purchaseCorrectionResultSchema = z.object({
  purchase: purchaseSchema,
  correction: purchaseCorrectionSchema,
});

export const purchaseListResponseSchema = z.object({
  items: z.array(purchaseSchema),
});

export const purchaseListQuerySchema = z.object({
  branchId: uuidSchema.optional(),
});

export const createPurchaseSchema = z.object({
  branchId: uuidSchema,
  supplierId: uuidSchema,
  deliveryDate: isoDateSchema,
  note: noteSchema.optional(),
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        unitId: uuidSchema,
        quantityMilli: quantityMilliSchema,
        unitPriceMinor: unitPriceMinorSchema,
      }),
    )
    .min(1),
});

export const correctPurchaseSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const purchaseIdParamsSchema = z.object({
  purchaseId: uuidSchema,
});

export type PurchaseResponse = z.infer<typeof purchaseSchema>;
export type PurchaseListResponse = z.infer<typeof purchaseListResponseSchema>;
export type CreatePurchaseBody = z.infer<typeof createPurchaseSchema>;
export type PurchaseListQuery = z.infer<typeof purchaseListQuerySchema>;
export type CorrectPurchaseBody = z.infer<typeof correctPurchaseSchema>;
export type PurchaseCorrectionResponse = z.infer<typeof purchaseCorrectionSchema>;
export type PurchaseCorrectionResult = z.infer<typeof purchaseCorrectionResultSchema>;
