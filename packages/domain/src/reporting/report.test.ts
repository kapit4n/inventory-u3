import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asMeasurementUnitId,
  asProductId,
  asProductionBatchId,
  asSalesCheckpointId,
  asSupplierId,
} from '@inventory-u3/types';

import { buildReport, type ReportSource } from './report.js';

const BRANCH_A = asBranchId('branch-a');
const BRANCH_B = asBranchId('branch-b');
const PRODUCT_A = asProductId('product-a');
const PRODUCT_B = asProductId('product-b');
const UNIT_KG = asMeasurementUnitId('unit-kg');
const UNIT_BOX = asMeasurementUnitId('unit-box');
const SUPPLIER = asSupplierId('supplier-1');

function source(overrides: Partial<ReportSource> = {}): ReportSource {
  return {
    branches: [
      { branchId: BRANCH_A, branchName: 'North' },
      { branchId: BRANCH_B, branchName: 'South' },
    ],
    salesLines: [
      {
        checkpointId: asSalesCheckpointId('sale-a'),
        branchId: BRANCH_A,
        businessDate: '2026-11-16',
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 2_000,
        revenueMinor: 1_000,
        trayCount: 0,
        estimatedWeightGrams: 0,
      },
      {
        checkpointId: asSalesCheckpointId('sale-b'),
        branchId: BRANCH_B,
        businessDate: '2026-11-17',
        productId: PRODUCT_B,
        productName: 'Trays',
        productKind: 'PROCESSED',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 1_000,
        revenueMinor: 600,
        trayCount: 2,
        estimatedWeightGrams: 1_000,
        measuredWeightGrams: 950,
      },
    ],
    purchaseLines: [
      {
        purchaseId: 'purchase-1',
        branchId: BRANCH_A,
        supplierId: SUPPLIER,
        supplierName: 'Farm Co',
        deliveryDate: '2026-11-16',
        totalMinor: 900,
      },
    ],
    costLines: [
      {
        purchaseId: 'purchase-1',
        branchId: BRANCH_A,
        productId: PRODUCT_A,
        unitId: UNIT_KG,
        unitPriceMinor: 400,
        deliveryDate: '2026-11-16',
        receivedAt: '2026-11-16T09:00:00.000Z',
      },
      {
        purchaseId: 'purchase-2',
        branchId: BRANCH_A,
        productId: PRODUCT_A,
        unitId: UNIT_KG,
        unitPriceMinor: 450,
        deliveryDate: '2026-11-17',
        receivedAt: '2026-11-17T09:00:00.000Z',
      },
      {
        purchaseId: 'purchase-3',
        branchId: BRANCH_B,
        productId: PRODUCT_B,
        unitId: UNIT_BOX,
        unitPriceMinor: 500,
        deliveryDate: '2026-11-15',
        receivedAt: '2026-11-15T09:00:00.000Z',
      },
    ],
    productionLines: [
      {
        batchId: asProductionBatchId('batch-1'),
        branchId: BRANCH_A,
        businessDate: '2026-11-16',
        productId: PRODUCT_B,
        productName: 'Trays',
        productKind: 'PROCESSED',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        trayCount: 2,
        estimatedWeightGrams: 1_000,
      },
    ],
    wasteLines: [
      {
        branchId: BRANCH_A,
        occurredAt: '2026-11-17T02:00:00.000Z',
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 100,
        source: 'INVENTORY',
      },
      {
        branchId: BRANCH_A,
        occurredAt: '2026-11-17T05:30:00.000Z',
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 50,
        source: 'PRODUCTION',
      },
    ],
    inventoryLines: [
      {
        branchId: BRANCH_A,
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 3_000,
      },
      {
        branchId: BRANCH_B,
        productId: PRODUCT_B,
        productName: 'Trays',
        productKind: 'PROCESSED',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 500,
      },
    ],
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    from: '2026-11-16',
    to: '2026-11-17',
    granularity: 'day' as const,
    timezone: 'America/New_York',
    currency: 'USD',
    ...overrides,
  };
}

describe('buildReport', () => {
  it('totals sales, latest purchase cost and estimated gross profit', () => {
    const report = buildReport(source(), input());

    expect(report.totals).toMatchObject({
      salesTotalMinor: 1_600,
      purchasesTotalMinor: 900,
      estimatedCostMinor: 800,
      estimatedGrossProfitMinor: 800,
      missingCostProductCount: 1,
      salesCheckpointCount: 2,
      purchaseCount: 1,
      productionBatchCount: 1,
      productionTrayCount: 2,
      productionEstimatedWeightGrams: 1_000,
      wasteRecordCount: 2,
      inventoryProductCount: 2,
    });
    expect(report.salesByBranch).toEqual([
      {
        branchId: BRANCH_A,
        branchName: 'North',
        salesTotalMinor: 1_000,
        estimatedCostMinor: 800,
        estimatedGrossProfitMinor: 200,
        checkpointCount: 1,
        missingCostProductCount: 0,
      },
      {
        branchId: BRANCH_B,
        branchName: 'South',
        salesTotalMinor: 600,
        estimatedCostMinor: 0,
        estimatedGrossProfitMinor: 600,
        checkpointCount: 1,
        missingCostProductCount: 1,
      },
    ]);
  });

  it('uses the latest purchase cost available on the sale date', () => {
    const report = buildReport(source(), input());
    const chicken = report.salesByProduct.find((line) => line.productId === PRODUCT_A);

    expect(chicken).toMatchObject({
      quantityMilli: 2_000,
      salesTotalMinor: 1_000,
      estimatedCostMinor: 800,
      estimatedGrossProfitMinor: 200,
    });

    const later = buildReport(
      source({
        salesLines: [
          {
            ...source().salesLines[0]!,
            businessDate: '2026-11-17',
          },
        ],
      }),
      input(),
    );

    expect(later.salesByProduct[0]).toMatchObject({
      estimatedCostMinor: 900,
      estimatedGrossProfitMinor: 100,
    });
  });

  it('excludes a purchase whose unit does not match the sold unit', () => {
    const report = buildReport(source(), input());
    const trays = report.salesByProduct.find((line) => line.productId === PRODUCT_B);

    expect(trays).toMatchObject({
      estimatedCostMinor: 0,
      estimatedGrossProfitMinor: 600,
    });
    expect(report.totals.missingCostProductCount).toBe(1);
  });

  it('groups periods for the requested granularity', () => {
    const report = buildReport(source(), input({ granularity: 'week' }));

    expect(report.periods).toEqual([
      {
        periodStart: '2026-11-16',
        periodEnd: '2026-11-17',
        salesTotalMinor: 1_600,
        purchasesTotalMinor: 900,
        estimatedCostMinor: 800,
        estimatedGrossProfitMinor: 800,
        salesCheckpointCount: 2,
        purchaseCount: 1,
        productionBatchCount: 1,
        productionTrayCount: 2,
        productionEstimatedWeightGrams: 1_000,
        wasteRecordCount: 2,
      },
    ]);
  });

  it('groups waste by product and source using the organization timezone', () => {
    const report = buildReport(source(), input());
    const chickenWaste = report.wasteByProduct.filter((line) => line.productId === PRODUCT_A);

    expect(chickenWaste).toEqual([
      {
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        source: 'INVENTORY',
        quantityMilli: 100,
        recordCount: 1,
      },
      {
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        source: 'PRODUCTION',
        quantityMilli: 50,
        recordCount: 1,
      },
    ]);
    expect(report.periods[0]?.wasteRecordCount).toBe(1);
    expect(report.periods[1]?.wasteRecordCount).toBe(1);
  });

  it('reports inventory balances per branch and product', () => {
    const report = buildReport(source(), input());

    expect(report.inventoryByProduct).toEqual([
      {
        branchId: BRANCH_A,
        branchName: 'North',
        productId: PRODUCT_A,
        productName: 'Chicken',
        productKind: 'RAW',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 3_000,
      },
      {
        branchId: BRANCH_B,
        branchName: 'South',
        productId: PRODUCT_B,
        productName: 'Trays',
        productKind: 'PROCESSED',
        unitId: UNIT_KG,
        unitCode: 'KG',
        unitName: 'Kilogram',
        quantityMilli: 500,
      },
    ]);
  });

  it('rejects invalid ranges and granularities', () => {
    expect(() => buildReport(source(), input({ from: '2026-11-18' }))).toThrow(
      'The report start date must not be after its end date',
    );
    expect(() => buildReport(source(), input({ granularity: 'year' }))).toThrow(
      'The report granularity must be day, week or month',
    );
  });
});
