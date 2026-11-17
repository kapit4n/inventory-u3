import type { ReportResponse } from '@inventory-u3/validation';

import { currencyFractionDigits } from '../products/price-format.js';

export interface ReportCsvLabels {
  readonly sections: {
    readonly summary: string;
    readonly periods: string;
    readonly salesByBranch: string;
    readonly salesByProduct: string;
    readonly purchasesBySupplier: string;
    readonly productionByProduct: string;
    readonly wasteByProduct: string;
    readonly inventoryByProduct: string;
  };
  readonly summary: {
    readonly metric: string;
    readonly value: string;
    readonly sales: string;
    readonly purchases: string;
    readonly estimatedCost: string;
    readonly estimatedGrossProfit: string;
    readonly missingCostProducts: string;
    readonly salesCheckpoints: string;
    readonly purchaseCount: string;
    readonly productionBatches: string;
    readonly productionTrays: string;
    readonly productionEstimatedKg: string;
    readonly wasteRecords: string;
    readonly inventoryProducts: string;
    readonly currency: string;
    readonly range: string;
  };
  readonly columns: {
    readonly period: string;
    readonly sales: string;
    readonly purchases: string;
    readonly estimatedCost: string;
    readonly estimatedGrossProfit: string;
    readonly salesCheckpoints: string;
    readonly purchaseCount: string;
    readonly productionBatches: string;
    readonly productionTrays: string;
    readonly wasteRecords: string;
    readonly branch: string;
    readonly product: string;
    readonly unit: string;
    readonly quantity: string;
    readonly revenue: string;
    readonly supplier: string;
    readonly source: string;
    readonly records: string;
    readonly estimatedKg: string;
    readonly measuredKg: string;
    readonly checkpointCount: string;
    readonly missingCostProducts: string;
  };
}

export function reportToCsv(report: ReportResponse, labels: ReportCsvLabels): string {
  const rows: string[][] = [];
  const { range, totals, currency } = report;
  const currencyDigits = currencyFractionDigits(currency);
  const money = (minor: number) => (minor / 10 ** currencyDigits).toFixed(currencyDigits);

  rows.push([labels.sections.summary]);
  rows.push([labels.summary.metric, labels.summary.value]);
  rows.push([labels.summary.sales, money(totals.salesTotalMinor)]);
  rows.push([labels.summary.purchases, money(totals.purchasesTotalMinor)]);
  rows.push([labels.summary.estimatedCost, money(totals.estimatedCostMinor)]);
  rows.push([labels.summary.estimatedGrossProfit, money(totals.estimatedGrossProfitMinor)]);
  rows.push([labels.summary.missingCostProducts, String(totals.missingCostProductCount)]);
  rows.push([labels.summary.salesCheckpoints, String(totals.salesCheckpointCount)]);
  rows.push([labels.summary.purchaseCount, String(totals.purchaseCount)]);
  rows.push([labels.summary.productionBatches, String(totals.productionBatchCount)]);
  rows.push([labels.summary.productionTrays, String(totals.productionTrayCount)]);
  rows.push([labels.summary.productionEstimatedKg, weight(totals.productionEstimatedWeightGrams)]);
  rows.push([labels.summary.wasteRecords, String(totals.wasteRecordCount)]);
  rows.push([labels.summary.inventoryProducts, String(totals.inventoryProductCount)]);
  rows.push([labels.summary.currency, currency]);
  rows.push([labels.summary.range, `${range.from} / ${range.to} (${range.granularity})`]);
  rows.push([]);

  rows.push([labels.sections.periods]);
  rows.push([
    labels.columns.period,
    labels.columns.sales,
    labels.columns.purchases,
    labels.columns.estimatedCost,
    labels.columns.estimatedGrossProfit,
    labels.columns.salesCheckpoints,
    labels.columns.purchaseCount,
    labels.columns.productionBatches,
    labels.columns.productionTrays,
    labels.columns.wasteRecords,
  ]);
  for (const period of report.periods) {
    rows.push([
      `${period.periodStart} / ${period.periodEnd}`,
      money(period.salesTotalMinor),
      money(period.purchasesTotalMinor),
      money(period.estimatedCostMinor),
      money(period.estimatedGrossProfitMinor),
      String(period.salesCheckpointCount),
      String(period.purchaseCount),
      String(period.productionBatchCount),
      String(period.productionTrayCount),
      String(period.wasteRecordCount),
    ]);
  }
  rows.push([]);

  rows.push([labels.sections.salesByBranch]);
  rows.push([
    labels.columns.branch,
    labels.columns.sales,
    labels.columns.estimatedCost,
    labels.columns.estimatedGrossProfit,
    labels.columns.checkpointCount,
    labels.columns.missingCostProducts,
  ]);
  for (const branch of report.salesByBranch) {
    rows.push([
      branch.branchName,
      money(branch.salesTotalMinor),
      money(branch.estimatedCostMinor),
      money(branch.estimatedGrossProfitMinor),
      String(branch.checkpointCount),
      String(branch.missingCostProductCount),
    ]);
  }
  rows.push([]);

  rows.push([labels.sections.salesByProduct]);
  rows.push([
    labels.columns.product,
    labels.columns.unit,
    labels.columns.quantity,
    labels.columns.revenue,
    labels.columns.estimatedCost,
    labels.columns.estimatedGrossProfit,
    labels.columns.estimatedKg,
    labels.columns.measuredKg,
  ]);
  for (const product of report.salesByProduct) {
    rows.push([
      product.productName,
      product.unitCode,
      quantity(product.quantityMilli),
      money(product.salesTotalMinor),
      money(product.estimatedCostMinor),
      money(product.estimatedGrossProfitMinor),
      weight(product.estimatedWeightGrams),
      weight(product.measuredWeightGrams),
    ]);
  }
  rows.push([]);

  rows.push([labels.sections.purchasesBySupplier]);
  rows.push([labels.columns.supplier, labels.columns.purchaseCount, labels.columns.purchases]);
  for (const supplier of report.purchasesBySupplier) {
    rows.push([supplier.supplierName, String(supplier.purchaseCount), money(supplier.totalMinor)]);
  }
  rows.push([]);

  rows.push([labels.sections.productionByProduct]);
  rows.push([
    labels.columns.product,
    labels.columns.unit,
    labels.columns.productionBatches,
    labels.columns.productionTrays,
    labels.columns.estimatedKg,
    labels.columns.measuredKg,
  ]);
  for (const product of report.productionByProduct) {
    rows.push([
      product.productName,
      product.unitCode,
      String(product.batchCount),
      String(product.trayCount),
      weight(product.estimatedWeightGrams),
      weight(product.measuredWeightGrams),
    ]);
  }
  rows.push([]);

  rows.push([labels.sections.wasteByProduct]);
  rows.push([
    labels.columns.product,
    labels.columns.unit,
    labels.columns.source,
    labels.columns.quantity,
    labels.columns.records,
  ]);
  for (const waste of report.wasteByProduct) {
    rows.push([
      waste.productName,
      waste.unitCode,
      waste.source,
      quantity(waste.quantityMilli),
      String(waste.recordCount),
    ]);
  }
  rows.push([]);

  rows.push([labels.sections.inventoryByProduct]);
  rows.push([
    labels.columns.branch,
    labels.columns.product,
    labels.columns.unit,
    labels.columns.quantity,
  ]);
  for (const inventory of report.inventoryByProduct) {
    rows.push([
      inventory.branchName,
      inventory.productName,
      inventory.unitCode,
      quantity(inventory.quantityMilli),
    ]);
  }

  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function reportCsvFilename(report: ReportResponse): string {
  const branch = report.range.branchId === undefined ? 'all-branches' : report.range.branchId;
  return `inventory-report-${report.range.from}-${report.range.to}-${branch}.csv`;
}

function quantity(quantityMilli: number): string {
  return decimal(quantityMilli / 1000);
}

function weight(grams: number): string {
  return decimal(grams / 1000);
}

function decimal(value: number): string {
  const fixed = value.toFixed(3);
  return fixed.replace(/\.?0+$/, '');
}

function escapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
