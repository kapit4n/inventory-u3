/**
 * The smallest valid report the dashboard accepts.
 *
 * Specs that land on `/dashboard` but are about another surface use this so the
 * query resolves and the browser logs no failed-resource error. The dedicated
 * report spec supplies its own populated report.
 */
export const EMPTY_REPORT = {
  range: {
    from: '2026-09-29',
    to: '2026-10-05',
    granularity: 'day',
    timezone: 'UTC',
  },
  currency: 'USD',
  totals: {
    salesTotalMinor: 0,
    purchasesTotalMinor: 0,
    estimatedCostMinor: 0,
    estimatedGrossProfitMinor: 0,
    missingCostProductCount: 0,
    salesCheckpointCount: 0,
    purchaseCount: 0,
    productionBatchCount: 0,
    productionTrayCount: 0,
    productionEstimatedWeightGrams: 0,
    wasteRecordCount: 0,
    inventoryProductCount: 0,
  },
  periods: [],
  salesByBranch: [],
  salesByProduct: [],
  purchasesBySupplier: [],
  productionByProduct: [],
  wasteByProduct: [],
  inventoryByProduct: [],
} as const;
