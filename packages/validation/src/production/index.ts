import { z } from 'zod';

import { isoDateSchema, isoDateTimeSchema, uuidSchema } from '../common/index.js';

export const productionStatusSchema = z.enum(['DRAFT', 'CONFIRMED', 'CORRECTED']);
export const productionWeightBasisSchema = z.enum(['ESTIMATED', 'MEASURED']);

const quantityMilliSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const positiveIntegerSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const noteSchema = z.string().trim().min(1).max(500);

export const productionInputSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  batchId: uuidSchema,
  productId: uuidSchema,
  unitId: uuidSchema,
  quantityMilli: quantityMilliSchema,
  position: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
});

export const productionOutputSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  batchId: uuidSchema,
  productId: uuidSchema,
  presentationId: uuidSchema,
  trayCount: positiveIntegerSchema,
  averageWeightPerTrayGrams: positiveIntegerSchema,
  estimatedWeightGrams: positiveIntegerSchema,
  measuredWeightGrams: positiveIntegerSchema.optional(),
  weightBasis: productionWeightBasisSchema,
  position: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
});

export const productionWasteSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  batchId: uuidSchema,
  productId: uuidSchema,
  quantityMilli: quantityMilliSchema,
  reason: noteSchema,
  note: noteSchema.optional(),
  position: z.number().int().positive(),
  createdAt: isoDateTimeSchema,
});

export const productionBatchSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  businessDate: isoDateSchema,
  preparedByEmployeeId: uuidSchema,
  registeredByUserId: uuidSchema,
  status: productionStatusSchema,
  note: noteSchema.optional(),
  confirmedByUserId: uuidSchema.optional(),
  confirmedAt: isoDateTimeSchema.optional(),
  correctedByUserId: uuidSchema.optional(),
  correctedAt: isoDateTimeSchema.optional(),
  correctionReason: noteSchema.optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  inputs: z.array(productionInputSchema),
  outputs: z.array(productionOutputSchema),
  waste: z.array(productionWasteSchema),
});

export const productionBatchListResponseSchema = z.object({
  items: z.array(productionBatchSchema),
});

export const productionBatchListQuerySchema = z.object({
  branchId: uuidSchema.optional(),
});

export const createProductionBatchSchema = z
  .object({
    branchId: uuidSchema,
    businessDate: isoDateSchema,
    preparedByEmployeeId: uuidSchema,
    note: noteSchema.optional(),
    inputs: z
      .array(
        z.object({
          productId: uuidSchema,
          quantityMilli: quantityMilliSchema,
        }),
      )
      .default([]),
    outputs: z
      .array(
        z.object({
          productId: uuidSchema,
          presentationId: uuidSchema,
          trayCount: positiveIntegerSchema,
          measuredWeightGrams: positiveIntegerSchema.optional(),
        }),
      )
      .default([]),
    waste: z
      .array(
        z.object({
          productId: uuidSchema,
          quantityMilli: quantityMilliSchema,
          reason: noteSchema,
          note: noteSchema.optional(),
        }),
      )
      .default([]),
  })
  .refine((body) => body.inputs.length > 0 || body.outputs.length > 0 || body.waste.length > 0, {
    message: 'A production batch needs at least one input, output or waste line',
  });

export const correctProductionBatchSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const productionBatchIdParamsSchema = z.object({
  batchId: uuidSchema,
});

export type ProductionBatchResponse = z.infer<typeof productionBatchSchema>;
export type ProductionBatchListResponse = z.infer<typeof productionBatchListResponseSchema>;
export type CreateProductionBatchBody = z.infer<typeof createProductionBatchSchema>;
export type CorrectProductionBatchBody = z.infer<typeof correctProductionBatchSchema>;
