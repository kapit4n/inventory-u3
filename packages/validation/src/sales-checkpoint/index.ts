import { z } from 'zod';

import { isoDateSchema, isoDateTimeSchema, uuidSchema } from '../common/index.js';

export const salesCheckpointStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'CORRECTED']);
export const salesCheckpointPeriodSchema = z.enum(['MORNING', 'EVENING']);
export const salesCheckpointWeightBasisSchema = z.enum(['ESTIMATED', 'MEASURED', 'NOT_APPLICABLE']);
export const salesCheckpointPriceBasisSchema = z.enum(['PER_KILOGRAM', 'PER_SALES_UNIT']);

const positiveIntegerSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const noteSchema = z.string().trim().min(1).max(500);

export const salesCheckpointItemSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  checkpointId: uuidSchema,
  productId: uuidSchema,
  productKind: z.enum(['RAW', 'PROCESSED']),
  unitId: uuidSchema,
  quantityMilli: positiveIntegerSchema,
  presentationId: uuidSchema.optional(),
  trayCount: positiveIntegerSchema.optional(),
  averageWeightPerTrayGrams: positiveIntegerSchema.optional(),
  estimatedWeightGrams: positiveIntegerSchema.optional(),
  measuredWeightGrams: positiveIntegerSchema.optional(),
  weightBasis: salesCheckpointWeightBasisSchema,
  sellingPriceAmountMinor: z.number().int().nonnegative(),
  sellingPriceBasis: salesCheckpointPriceBasisSchema,
  sellingPriceCurrency: z.string().regex(/^[A-Z]{3}$/),
  estimatedSalesValueMinor: z.number().int().nonnegative(),
  position: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
});

export const salesCheckpointSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  businessDate: isoDateSchema,
  period: salesCheckpointPeriodSchema,
  status: salesCheckpointStatusSchema,
  registeredByUserId: uuidSchema,
  note: noteSchema.optional(),
  confirmedByUserId: uuidSchema.optional(),
  confirmedAt: isoDateTimeSchema.optional(),
  correctedByUserId: uuidSchema.optional(),
  correctedAt: isoDateTimeSchema.optional(),
  correctionReason: noteSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  items: z.array(salesCheckpointItemSchema),
});

export const salesCheckpointListResponseSchema = z.object({
  items: z.array(salesCheckpointSchema),
});

export const salesCheckpointListQuerySchema = z.object({
  branchId: uuidSchema.optional(),
});

export const createSalesCheckpointItemSchema = z.object({
  productId: uuidSchema,
  quantityMilli: positiveIntegerSchema.optional(),
  presentationId: uuidSchema.optional(),
  trayCount: positiveIntegerSchema.optional(),
  measuredWeightGrams: positiveIntegerSchema.optional(),
});

export const createSalesCheckpointSchema = z.object({
  branchId: uuidSchema,
  businessDate: isoDateSchema,
  period: salesCheckpointPeriodSchema,
  note: noteSchema.optional(),
  items: z.array(createSalesCheckpointItemSchema).min(1),
});

export const correctSalesCheckpointSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const salesCheckpointIdParamsSchema = z.object({
  checkpointId: uuidSchema,
});

export type SalesCheckpointResponse = z.infer<typeof salesCheckpointSchema>;
export type SalesCheckpointListResponse = z.infer<typeof salesCheckpointListResponseSchema>;
export type CreateSalesCheckpointBody = z.infer<typeof createSalesCheckpointSchema>;
export type CorrectSalesCheckpointBody = z.infer<typeof correctSalesCheckpointSchema>;
