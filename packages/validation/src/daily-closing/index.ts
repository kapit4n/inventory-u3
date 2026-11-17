import { z } from 'zod';

import { isoDateSchema, isoDateTimeSchema, uuidSchema } from '../common/index.js';

export const dailyClosingStatusSchema = z.enum(['DRAFT', 'REVIEWED', 'CONFIRMED', 'REOPENED']);
export const dailyClosingCostBasisSchema = z.enum(['LATEST_PURCHASE_PRICE', 'UNAVAILABLE']);

const integerSchema = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);

export const dailyClosingItemSchema = z.object({
  productId: uuidSchema,
  productKind: z.enum(['RAW', 'PROCESSED']),
  unitId: uuidSchema,
  openingQuantityMilli: integerSchema,
  purchasedQuantityMilli: integerSchema,
  producedQuantityMilli: integerSchema,
  soldQuantityMilli: integerSchema,
  wasteQuantityMilli: integerSchema,
  adjustmentQuantityMilli: integerSchema,
  correctionQuantityMilli: integerSchema,
  reconciliationDifferenceQuantityMilli: integerSchema,
  closingQuantityMilli: integerSchema,
  estimatedRevenueMinor: z.number().int().nonnegative(),
  unitCostAmountMinor: z.number().int().nonnegative().optional(),
  costBasis: dailyClosingCostBasisSchema,
  estimatedCostOfSalesMinor: z.number().int().nonnegative(),
  position: z.number().int().positive(),
});

export const dailyClosingSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  branchId: uuidSchema,
  businessDate: isoDateSchema,
  version: z.number().int().positive(),
  previousClosingId: uuidSchema.optional(),
  status: dailyClosingStatusSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  purchasesTotalMinor: z.number().int().nonnegative(),
  purchaseCount: z.number().int().nonnegative(),
  unreceivedPurchaseCount: z.number().int().nonnegative(),
  productionBatchCount: z.number().int().nonnegative(),
  productionDraftCount: z.number().int().nonnegative(),
  productionTrayCount: z.number().int().nonnegative(),
  productionEstimatedWeightGrams: z.number().int().nonnegative(),
  salesCheckpointCount: z.number().int().nonnegative(),
  draftSalesCheckpointCount: z.number().int().nonnegative(),
  salesTotalMinor: z.number().int().nonnegative(),
  wasteRecordCount: z.number().int().nonnegative(),
  inventoryDifferenceProductCount: z.number().int().nonnegative(),
  estimatedRevenueMinor: z.number().int().nonnegative(),
  estimatedCostMinor: z.number().int().nonnegative(),
  estimatedGrossProfitMinor: integerSchema,
  missingCostProductCount: z.number().int().nonnegative(),
  negativeStockProductCount: z.number().int().nonnegative(),
  createdByUserId: uuidSchema,
  reviewedByUserId: uuidSchema.optional(),
  reviewedAt: isoDateTimeSchema.optional(),
  confirmedByUserId: uuidSchema.optional(),
  confirmedAt: isoDateTimeSchema.optional(),
  reopenedByUserId: uuidSchema.optional(),
  reopenedAt: isoDateTimeSchema.optional(),
  reopenReason: z.string().optional(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  items: z.array(dailyClosingItemSchema),
});

export const dailyClosingListResponseSchema = z.object({ items: z.array(dailyClosingSchema) });

export const dailyClosingListQuerySchema = z.object({
  branchId: uuidSchema.optional(),
  businessDate: isoDateSchema.optional(),
});

export const dailyClosingIdParamsSchema = z.object({ dailyClosingId: uuidSchema });

export const createDailyClosingSchema = z.object({
  branchId: uuidSchema,
  businessDate: isoDateSchema,
});

export const reopenDailyClosingSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type DailyClosingResponse = z.infer<typeof dailyClosingSchema>;
export type DailyClosingListResponse = z.infer<typeof dailyClosingListResponseSchema>;
export type CreateDailyClosingBody = z.infer<typeof createDailyClosingSchema>;
export type ReopenDailyClosingBody = z.infer<typeof reopenDailyClosingSchema>;
