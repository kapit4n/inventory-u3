import { z } from 'zod';

import { isoDateTimeSchema, uuidSchema } from '../common/index.js';

export const stockMovementReasonSchema = z.enum([
  'RECEIVING',
  'PRODUCTION_INPUT',
  'PRODUCTION_OUTPUT',
  'SALES_CHECKPOINT',
  'ADJUSTMENT',
  'WASTE',
  'CORRECTION',
]);

export const stockMovementSourceTypeSchema = z.enum([
  'PURCHASE_RECEIPT',
  'PURCHASE_CORRECTION',
  'PRODUCTION_BATCH',
  'SALES_CHECKPOINT',
  'ADJUSTMENT',
  'WASTE_REPORT',
]);

export const stockAdjustmentKindSchema = z.enum(['MANUAL', 'RECONCILIATION']);

const stockQuantityMilliSchema = z.number().int().max(Number.MAX_SAFE_INTEGER);
const positiveStockQuantityMilliSchema = stockQuantityMilliSchema.positive();
const stockReasonSchema = z.string().trim().min(1).max(500);
const stockNoteSchema = z.string().trim().min(1).max(500);

export const stockMovementSourceSchema = z.object({
  type: stockMovementSourceTypeSchema,
  id: z.string().trim().min(1),
});

export const stockMovementSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  productId: uuidSchema,
  quantityDeltaMilli: stockQuantityMilliSchema.refine((value) => value !== 0),
  reason: stockMovementReasonSchema,
  source: stockMovementSourceSchema.optional(),
  correctsMovementId: uuidSchema.optional(),
  occurredAt: isoDateTimeSchema,
  recordedAt: isoDateTimeSchema,
  recordedByUserId: uuidSchema,
  note: stockNoteSchema.optional(),
});

export const stockBalanceSchema = z.object({
  organizationId: uuidSchema,
  branchId: uuidSchema,
  productId: uuidSchema,
  quantityOnHandMilli: stockQuantityMilliSchema,
  updatedAt: isoDateTimeSchema,
});

export const stockAdjustmentSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  productId: uuidSchema,
  kind: stockAdjustmentKindSchema,
  quantityDeltaMilli: stockQuantityMilliSchema,
  reason: stockReasonSchema,
  expectedQuantityMilli: stockQuantityMilliSchema.nonnegative().optional(),
  countedQuantityMilli: stockQuantityMilliSchema.nonnegative().optional(),
  note: stockNoteSchema.optional(),
  occurredAt: isoDateTimeSchema,
  recordedAt: isoDateTimeSchema,
  recordedByUserId: uuidSchema,
});

export const inventoryWasteSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  productId: uuidSchema,
  quantityMilli: positiveStockQuantityMilliSchema,
  reason: stockReasonSchema,
  note: stockNoteSchema.optional(),
  occurredAt: isoDateTimeSchema,
  recordedAt: isoDateTimeSchema,
  recordedByUserId: uuidSchema,
});

export const stockBalanceListResponseSchema = z.object({
  items: z.array(stockBalanceSchema),
});

export const stockMovementListResponseSchema = z.object({
  items: z.array(stockMovementSchema),
});

export const stockBalanceQuerySchema = z.object({
  branchId: uuidSchema,
});

export const stockMovementQuerySchema = z.object({
  branchId: uuidSchema,
});

export const stockProductParamsSchema = z.object({
  productId: uuidSchema,
});

export const stockAdjustmentBodySchema = z.object({
  branchId: uuidSchema,
  productId: uuidSchema,
  quantityDeltaMilli: stockQuantityMilliSchema.refine((value) => value !== 0, {
    message: 'Adjustment quantity must not be zero',
  }),
  reason: stockReasonSchema,
  note: stockNoteSchema.optional(),
});

export const inventoryWasteBodySchema = z.object({
  branchId: uuidSchema,
  productId: uuidSchema,
  quantityMilli: positiveStockQuantityMilliSchema,
  reason: stockReasonSchema,
  note: stockNoteSchema.optional(),
});

export const stockReconciliationBodySchema = z.object({
  branchId: uuidSchema,
  productId: uuidSchema,
  countedQuantityMilli: stockQuantityMilliSchema.nonnegative(),
  reason: stockReasonSchema,
  note: stockNoteSchema.optional(),
});

export type StockMovementResponse = z.infer<typeof stockMovementSchema>;
export type StockBalanceResponse = z.infer<typeof stockBalanceSchema>;
export type StockAdjustmentResponse = z.infer<typeof stockAdjustmentSchema>;
export type InventoryWasteResponse = z.infer<typeof inventoryWasteSchema>;
export type StockMovementListResponse = z.infer<typeof stockMovementListResponseSchema>;
export type StockBalanceListResponse = z.infer<typeof stockBalanceListResponseSchema>;
export type StockAdjustmentBody = z.infer<typeof stockAdjustmentBodySchema>;
export type InventoryWasteBody = z.infer<typeof inventoryWasteBodySchema>;
export type StockReconciliationBody = z.infer<typeof stockReconciliationBodySchema>;
