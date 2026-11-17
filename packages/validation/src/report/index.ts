import { z } from 'zod';

import { isoDateSchema, uuidSchema } from '../common/index.js';

const integerSchema = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
const nonNegativeIntegerSchema = z.number().int().nonnegative();
const productKindSchema = z.enum(['RAW', 'PROCESSED']);
const unitSchema = z.object({
  unitId: uuidSchema,
  unitCode: z.string(),
  unitName: z.string(),
});
const productSchema = z.object({
  productId: uuidSchema,
  productName: z.string(),
  productKind: productKindSchema,
  ...unitSchema.shape,
});

export const reportGranularitySchema = z.enum(['day', 'week', 'month']);
export const reportWasteSourceSchema = z.enum(['INVENTORY', 'PRODUCTION']);

export const reportQuerySchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  granularity: reportGranularitySchema.default('day'),
  branchId: uuidSchema.optional(),
});

export const reportRangeSchema = z.object({
  from: isoDateSchema,
  to: isoDateSchema,
  granularity: reportGranularitySchema,
  timezone: z.string(),
  branchId: uuidSchema.optional(),
});

export const reportTotalsSchema = z.object({
  salesTotalMinor: nonNegativeIntegerSchema,
  purchasesTotalMinor: nonNegativeIntegerSchema,
  estimatedCostMinor: nonNegativeIntegerSchema,
  estimatedGrossProfitMinor: integerSchema,
  missingCostProductCount: nonNegativeIntegerSchema,
  salesCheckpointCount: nonNegativeIntegerSchema,
  purchaseCount: nonNegativeIntegerSchema,
  productionBatchCount: nonNegativeIntegerSchema,
  productionTrayCount: nonNegativeIntegerSchema,
  productionEstimatedWeightGrams: nonNegativeIntegerSchema,
  wasteRecordCount: nonNegativeIntegerSchema,
  inventoryProductCount: nonNegativeIntegerSchema,
});

export const reportPeriodSchema = z.object({
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  salesTotalMinor: nonNegativeIntegerSchema,
  purchasesTotalMinor: nonNegativeIntegerSchema,
  estimatedCostMinor: nonNegativeIntegerSchema,
  estimatedGrossProfitMinor: integerSchema,
  salesCheckpointCount: nonNegativeIntegerSchema,
  purchaseCount: nonNegativeIntegerSchema,
  productionBatchCount: nonNegativeIntegerSchema,
  productionTrayCount: nonNegativeIntegerSchema,
  productionEstimatedWeightGrams: nonNegativeIntegerSchema,
  wasteRecordCount: nonNegativeIntegerSchema,
});

export const reportSalesByBranchSchema = z.object({
  branchId: uuidSchema,
  branchName: z.string(),
  salesTotalMinor: nonNegativeIntegerSchema,
  estimatedCostMinor: nonNegativeIntegerSchema,
  estimatedGrossProfitMinor: integerSchema,
  checkpointCount: nonNegativeIntegerSchema,
  missingCostProductCount: nonNegativeIntegerSchema,
});

export const reportSalesByProductSchema = z.object({
  ...productSchema.shape,
  quantityMilli: nonNegativeIntegerSchema,
  salesTotalMinor: nonNegativeIntegerSchema,
  estimatedCostMinor: nonNegativeIntegerSchema,
  estimatedGrossProfitMinor: integerSchema,
  trayCount: nonNegativeIntegerSchema,
  estimatedWeightGrams: nonNegativeIntegerSchema,
  measuredWeightGrams: nonNegativeIntegerSchema,
});

export const reportPurchasesBySupplierSchema = z.object({
  supplierId: uuidSchema,
  supplierName: z.string(),
  purchaseCount: nonNegativeIntegerSchema,
  totalMinor: nonNegativeIntegerSchema,
});

export const reportProductionByProductSchema = z.object({
  ...productSchema.shape,
  batchCount: nonNegativeIntegerSchema,
  trayCount: nonNegativeIntegerSchema,
  estimatedWeightGrams: nonNegativeIntegerSchema,
  measuredWeightGrams: nonNegativeIntegerSchema,
});

export const reportWasteByProductSchema = z.object({
  ...productSchema.shape,
  source: reportWasteSourceSchema,
  quantityMilli: nonNegativeIntegerSchema,
  recordCount: nonNegativeIntegerSchema,
});

export const reportInventoryByProductSchema = z.object({
  branchId: uuidSchema,
  branchName: z.string(),
  ...productSchema.shape,
  quantityMilli: integerSchema,
});

export const reportSchema = z.object({
  range: reportRangeSchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  totals: reportTotalsSchema,
  periods: z.array(reportPeriodSchema),
  salesByBranch: z.array(reportSalesByBranchSchema),
  salesByProduct: z.array(reportSalesByProductSchema),
  purchasesBySupplier: z.array(reportPurchasesBySupplierSchema),
  productionByProduct: z.array(reportProductionByProductSchema),
  wasteByProduct: z.array(reportWasteByProductSchema),
  inventoryByProduct: z.array(reportInventoryByProductSchema),
});

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
export type ReportResponse = z.infer<typeof reportSchema>;
