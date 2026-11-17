import type {
  BranchId,
  IsoDate,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductId,
  ProductionBatchId,
  SalesCheckpointId,
  SupplierId,
} from '@inventory-u3/types';

import { roundMilliAmount } from '../daily-closing/daily-closing.js';
import { DomainError } from '../shared/errors.js';
import { isValidIsoDate, localMoment } from '../shared/time.js';

import type { ProductKind } from '../product/product-kind.js';

export const REPORT_GRANULARITIES = ['day', 'week', 'month'] as const;

export type ReportGranularity = (typeof REPORT_GRANULARITIES)[number];

export const REPORT_WASTE_SOURCES = ['INVENTORY', 'PRODUCTION'] as const;

export type ReportWasteSource = (typeof REPORT_WASTE_SOURCES)[number];

export interface ReportQuery {
  readonly organizationId: OrganizationId;
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly branchId?: BranchId;
}

export interface ReportBranchSource {
  readonly branchId: BranchId;
  readonly branchName: string;
}

export interface ReportSalesLine {
  readonly checkpointId: SalesCheckpointId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly quantityMilli: number;
  readonly revenueMinor: number;
  readonly trayCount: number;
  readonly estimatedWeightGrams: number;
  readonly measuredWeightGrams?: number;
}

export interface ReportPurchaseLine {
  readonly purchaseId: string;
  readonly branchId: BranchId;
  readonly supplierId: SupplierId;
  readonly supplierName: string;
  readonly deliveryDate: IsoDate;
  readonly totalMinor: number;
}

export interface ReportCostLine {
  readonly purchaseId: string;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly unitId: MeasurementUnitId;
  readonly unitPriceMinor: number;
  readonly deliveryDate: IsoDate;
  readonly receivedAt: IsoDateTime;
}

export interface ReportProductionLine {
  readonly batchId: ProductionBatchId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly trayCount: number;
  readonly estimatedWeightGrams: number;
  readonly measuredWeightGrams?: number;
}

export interface ReportWasteLine {
  readonly branchId: BranchId;
  readonly occurredAt: IsoDateTime;
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly quantityMilli: number;
  readonly source: ReportWasteSource;
}

export interface ReportInventoryLine {
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly quantityMilli: number;
}

export interface ReportSource {
  readonly branches: readonly ReportBranchSource[];
  readonly salesLines: readonly ReportSalesLine[];
  readonly purchaseLines: readonly ReportPurchaseLine[];
  readonly costLines: readonly ReportCostLine[];
  readonly productionLines: readonly ReportProductionLine[];
  readonly wasteLines: readonly ReportWasteLine[];
  readonly inventoryLines: readonly ReportInventoryLine[];
}

export interface BuildReportInput {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly granularity: ReportGranularity;
  readonly timezone: string;
  readonly currency: string;
  readonly branchId?: BranchId;
}

export interface ReportRange {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly granularity: ReportGranularity;
  readonly timezone: string;
  readonly branchId?: BranchId;
}

export interface ReportTotals {
  readonly salesTotalMinor: number;
  readonly purchasesTotalMinor: number;
  readonly estimatedCostMinor: number;
  readonly estimatedGrossProfitMinor: number;
  readonly missingCostProductCount: number;
  readonly salesCheckpointCount: number;
  readonly purchaseCount: number;
  readonly productionBatchCount: number;
  readonly productionTrayCount: number;
  readonly productionEstimatedWeightGrams: number;
  readonly wasteRecordCount: number;
  readonly inventoryProductCount: number;
}

export interface ReportPeriod {
  readonly periodStart: IsoDate;
  readonly periodEnd: IsoDate;
  readonly salesTotalMinor: number;
  readonly purchasesTotalMinor: number;
  readonly estimatedCostMinor: number;
  readonly estimatedGrossProfitMinor: number;
  readonly salesCheckpointCount: number;
  readonly purchaseCount: number;
  readonly productionBatchCount: number;
  readonly productionTrayCount: number;
  readonly productionEstimatedWeightGrams: number;
  readonly wasteRecordCount: number;
}

export interface ReportSalesByBranch {
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly salesTotalMinor: number;
  readonly estimatedCostMinor: number;
  readonly estimatedGrossProfitMinor: number;
  readonly checkpointCount: number;
  readonly missingCostProductCount: number;
}

export interface ReportSalesByProduct {
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly quantityMilli: number;
  readonly salesTotalMinor: number;
  readonly estimatedCostMinor: number;
  readonly estimatedGrossProfitMinor: number;
  readonly trayCount: number;
  readonly estimatedWeightGrams: number;
  readonly measuredWeightGrams: number;
}

export interface ReportPurchasesBySupplier {
  readonly supplierId: SupplierId;
  readonly supplierName: string;
  readonly purchaseCount: number;
  readonly totalMinor: number;
}

export interface ReportProductionByProduct {
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly batchCount: number;
  readonly trayCount: number;
  readonly estimatedWeightGrams: number;
  readonly measuredWeightGrams: number;
}

export interface ReportWasteByProduct {
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly source: ReportWasteSource;
  readonly quantityMilli: number;
  readonly recordCount: number;
}

export interface ReportInventoryByProduct {
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly productId: ProductId;
  readonly productName: string;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  readonly unitCode: string;
  readonly unitName: string;
  readonly quantityMilli: number;
}

export interface Report {
  readonly range: ReportRange;
  readonly currency: string;
  readonly totals: ReportTotals;
  readonly periods: readonly ReportPeriod[];
  readonly salesByBranch: readonly ReportSalesByBranch[];
  readonly salesByProduct: readonly ReportSalesByProduct[];
  readonly purchasesBySupplier: readonly ReportPurchasesBySupplier[];
  readonly productionByProduct: readonly ReportProductionByProduct[];
  readonly wasteByProduct: readonly ReportWasteByProduct[];
  readonly inventoryByProduct: readonly ReportInventoryByProduct[];
}

interface MutablePeriod {
  periodStart: IsoDate;
  periodEnd: IsoDate;
  salesTotalMinor: number;
  purchasesTotalMinor: number;
  estimatedCostMinor: number;
  salesCheckpointIds: Set<string>;
  purchaseIds: Set<string>;
  productionBatchIds: Set<string>;
  productionTrayCount: number;
  productionEstimatedWeightGrams: number;
  wasteRecordCount: number;
}

interface MutableSalesBranch {
  branchId: BranchId;
  branchName: string;
  salesTotalMinor: number;
  estimatedCostMinor: number;
  checkpointIds: Set<string>;
  missingCostProducts: Set<string>;
}

interface MutableSalesProduct {
  productId: ProductId;
  productName: string;
  productKind: ProductKind;
  unitId: MeasurementUnitId;
  unitCode: string;
  unitName: string;
  quantityMilli: number;
  salesTotalMinor: number;
  estimatedCostMinor: number;
  trayCount: number;
  estimatedWeightGrams: number;
  measuredWeightGrams: number;
}

interface MutableProductionProduct {
  productId: ProductId;
  productName: string;
  productKind: ProductKind;
  unitId: MeasurementUnitId;
  unitCode: string;
  unitName: string;
  batchIds: Set<string>;
  trayCount: number;
  estimatedWeightGrams: number;
  measuredWeightGrams: number;
}

interface MutableWasteProduct {
  productId: ProductId;
  productName: string;
  productKind: ProductKind;
  unitId: MeasurementUnitId;
  unitCode: string;
  unitName: string;
  source: ReportWasteSource;
  quantityMilli: number;
  recordCount: number;
}

interface MutableInventoryProduct {
  branchId: BranchId;
  branchName: string;
  productId: ProductId;
  productName: string;
  productKind: ProductKind;
  unitId: MeasurementUnitId;
  unitCode: string;
  unitName: string;
  quantityMilli: number;
}

export function isReportGranularity(value: unknown): value is ReportGranularity {
  return typeof value === 'string' && (REPORT_GRANULARITIES as readonly string[]).includes(value);
}

export function buildReport(source: ReportSource, input: BuildReportInput): Report {
  assertBuildInput(input);

  const branchNames = new Map(
    source.branches.map((branch) => [branch.branchId, branch.branchName]),
  );
  const periods = enumeratePeriods(input.from, input.to, input.granularity).map(
    (period): MutablePeriod => ({
      ...period,
      salesTotalMinor: 0,
      purchasesTotalMinor: 0,
      estimatedCostMinor: 0,
      salesCheckpointIds: new Set(),
      purchaseIds: new Set(),
      productionBatchIds: new Set(),
      productionTrayCount: 0,
      productionEstimatedWeightGrams: 0,
      wasteRecordCount: 0,
    }),
  );
  const periodByKey = new Map(periods.map((period) => [period.periodStart, period]));

  const salesByBranch = new Map<string, MutableSalesBranch>();
  const salesByProduct = new Map<string, MutableSalesProduct>();
  const purchasesBySupplier = new Map<string, ReportPurchasesBySupplier>();
  const productionByProduct = new Map<string, MutableProductionProduct>();
  const wasteByProduct = new Map<string, MutableWasteProduct>();
  const inventoryByProduct = new Map<string, MutableInventoryProduct>();

  const costLines = new Map<string, ReportCostLine[]>();
  for (const costLine of source.costLines) {
    const key = branchProductKey(costLine.branchId, costLine.productId);
    const lines = costLines.get(key) ?? [];
    lines.push(costLine);
    costLines.set(key, lines);
  }
  for (const lines of costLines.values()) {
    lines.sort(compareCostLines);
  }

  let salesTotalMinor = 0;
  let estimatedCostMinor = 0;
  const missingCostProducts = new Set<string>();
  const salesCheckpointIds = new Set<string>();

  for (const line of source.salesLines) {
    const costLine = latestCostLine(
      costLines.get(branchProductKey(line.branchId, line.productId)),
      line.businessDate,
    );
    const hasCost = costLine !== undefined && costLine.unitId === line.unitId;
    const lineCostMinor = hasCost
      ? roundMilliAmount(line.quantityMilli, costLine.unitPriceMinor)
      : 0;

    salesTotalMinor = safeAdd(salesTotalMinor, line.revenueMinor);
    estimatedCostMinor = safeAdd(estimatedCostMinor, lineCostMinor);
    salesCheckpointIds.add(line.checkpointId);
    if (!hasCost && line.quantityMilli > 0) {
      missingCostProducts.add(branchProductKey(line.branchId, line.productId));
    }

    const period = periodByKey.get(periodContaining(line.businessDate, input.granularity));
    if (period) {
      period.salesTotalMinor = safeAdd(period.salesTotalMinor, line.revenueMinor);
      period.estimatedCostMinor = safeAdd(period.estimatedCostMinor, lineCostMinor);
      period.salesCheckpointIds.add(line.checkpointId);
    }

    const branch = salesByBranch.get(line.branchId) ?? {
      branchId: line.branchId,
      branchName: branchNames.get(line.branchId) ?? '',
      salesTotalMinor: 0,
      estimatedCostMinor: 0,
      checkpointIds: new Set<string>(),
      missingCostProducts: new Set<string>(),
    };
    branch.salesTotalMinor = safeAdd(branch.salesTotalMinor, line.revenueMinor);
    branch.estimatedCostMinor = safeAdd(branch.estimatedCostMinor, lineCostMinor);
    branch.checkpointIds.add(line.checkpointId);
    if (!hasCost && line.quantityMilli > 0) {
      branch.missingCostProducts.add(branchProductKey(line.branchId, line.productId));
    }
    salesByBranch.set(line.branchId, branch);

    const productKey = productUnitKey(line.productId, line.unitId);
    const product = salesByProduct.get(productKey) ?? {
      productId: line.productId,
      productName: line.productName,
      productKind: line.productKind,
      unitId: line.unitId,
      unitCode: line.unitCode,
      unitName: line.unitName,
      quantityMilli: 0,
      salesTotalMinor: 0,
      estimatedCostMinor: 0,
      trayCount: 0,
      estimatedWeightGrams: 0,
      measuredWeightGrams: 0,
    };
    product.quantityMilli = safeAdd(product.quantityMilli, line.quantityMilli);
    product.salesTotalMinor = safeAdd(product.salesTotalMinor, line.revenueMinor);
    product.estimatedCostMinor = safeAdd(product.estimatedCostMinor, lineCostMinor);
    product.trayCount = safeAdd(product.trayCount, line.trayCount);
    product.estimatedWeightGrams = safeAdd(product.estimatedWeightGrams, line.estimatedWeightGrams);
    product.measuredWeightGrams = safeAdd(
      product.measuredWeightGrams,
      line.measuredWeightGrams ?? 0,
    );
    salesByProduct.set(productKey, product);
  }

  let purchasesTotalMinor = 0;
  const purchaseIds = new Set<string>();

  for (const line of source.purchaseLines) {
    purchasesTotalMinor = safeAdd(purchasesTotalMinor, line.totalMinor);
    purchaseIds.add(line.purchaseId);

    const period = periodByKey.get(periodContaining(line.deliveryDate, input.granularity));
    if (period) {
      period.purchasesTotalMinor = safeAdd(period.purchasesTotalMinor, line.totalMinor);
      period.purchaseIds.add(line.purchaseId);
    }

    const current = purchasesBySupplier.get(line.supplierId) ?? {
      supplierId: line.supplierId,
      supplierName: line.supplierName,
      purchaseCount: 0,
      totalMinor: 0,
    };
    purchasesBySupplier.set(line.supplierId, {
      ...current,
      purchaseCount: current.purchaseCount + 1,
      totalMinor: safeAdd(current.totalMinor, line.totalMinor),
    });
  }

  const productionBatchIds = new Set<string>();
  let productionTrayCount = 0;
  let productionEstimatedWeightGrams = 0;

  for (const line of source.productionLines) {
    productionBatchIds.add(line.batchId);
    productionTrayCount = safeAdd(productionTrayCount, line.trayCount);
    productionEstimatedWeightGrams = safeAdd(
      productionEstimatedWeightGrams,
      line.estimatedWeightGrams,
    );

    const period = periodByKey.get(periodContaining(line.businessDate, input.granularity));
    if (period) {
      period.productionBatchIds.add(line.batchId);
      period.productionTrayCount = safeAdd(period.productionTrayCount, line.trayCount);
      period.productionEstimatedWeightGrams = safeAdd(
        period.productionEstimatedWeightGrams,
        line.estimatedWeightGrams,
      );
    }

    const productKey = productUnitKey(line.productId, line.unitId);
    const product = productionByProduct.get(productKey) ?? {
      productId: line.productId,
      productName: line.productName,
      productKind: line.productKind,
      unitId: line.unitId,
      unitCode: line.unitCode,
      unitName: line.unitName,
      batchIds: new Set<string>(),
      trayCount: 0,
      estimatedWeightGrams: 0,
      measuredWeightGrams: 0,
    };
    product.batchIds.add(line.batchId);
    product.trayCount = safeAdd(product.trayCount, line.trayCount);
    product.estimatedWeightGrams = safeAdd(product.estimatedWeightGrams, line.estimatedWeightGrams);
    product.measuredWeightGrams = safeAdd(
      product.measuredWeightGrams,
      line.measuredWeightGrams ?? 0,
    );
    productionByProduct.set(productKey, product);
  }

  let wasteRecordCount = 0;

  for (const line of source.wasteLines) {
    wasteRecordCount += 1;
    const localDate = localMoment(new Date(line.occurredAt), input.timezone).localDate;
    const period = periodByKey.get(periodContaining(localDate, input.granularity));
    if (period) {
      period.wasteRecordCount += 1;
    }

    const key = `${productUnitKey(line.productId, line.unitId)}:${line.source}`;
    const current = wasteByProduct.get(key) ?? {
      productId: line.productId,
      productName: line.productName,
      productKind: line.productKind,
      unitId: line.unitId,
      unitCode: line.unitCode,
      unitName: line.unitName,
      source: line.source,
      quantityMilli: 0,
      recordCount: 0,
    };
    wasteByProduct.set(key, {
      ...current,
      quantityMilli: safeAdd(current.quantityMilli, line.quantityMilli),
      recordCount: current.recordCount + 1,
    });
  }

  for (const line of source.inventoryLines) {
    const key = `${branchProductKey(line.branchId, line.productId)}:${line.unitId}`;
    const current = inventoryByProduct.get(key) ?? {
      branchId: line.branchId,
      branchName: branchNames.get(line.branchId) ?? '',
      productId: line.productId,
      productName: line.productName,
      productKind: line.productKind,
      unitId: line.unitId,
      unitCode: line.unitCode,
      unitName: line.unitName,
      quantityMilli: 0,
    };
    inventoryByProduct.set(key, {
      ...current,
      quantityMilli: safeAdd(current.quantityMilli, line.quantityMilli),
    });
  }

  return {
    range: {
      from: input.from,
      to: input.to,
      granularity: input.granularity,
      timezone: input.timezone,
      ...(input.branchId === undefined ? {} : { branchId: input.branchId }),
    },
    currency: input.currency,
    totals: {
      salesTotalMinor,
      purchasesTotalMinor,
      estimatedCostMinor,
      estimatedGrossProfitMinor: safeSubtract(salesTotalMinor, estimatedCostMinor),
      missingCostProductCount: missingCostProducts.size,
      salesCheckpointCount: salesCheckpointIds.size,
      purchaseCount: purchaseIds.size,
      productionBatchCount: productionBatchIds.size,
      productionTrayCount,
      productionEstimatedWeightGrams,
      wasteRecordCount,
      inventoryProductCount: inventoryByProduct.size,
    },
    periods: periods.map((period) => ({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      salesTotalMinor: period.salesTotalMinor,
      purchasesTotalMinor: period.purchasesTotalMinor,
      estimatedCostMinor: period.estimatedCostMinor,
      estimatedGrossProfitMinor: safeSubtract(period.salesTotalMinor, period.estimatedCostMinor),
      salesCheckpointCount: period.salesCheckpointIds.size,
      purchaseCount: period.purchaseIds.size,
      productionBatchCount: period.productionBatchIds.size,
      productionTrayCount: period.productionTrayCount,
      productionEstimatedWeightGrams: period.productionEstimatedWeightGrams,
      wasteRecordCount: period.wasteRecordCount,
    })),
    salesByBranch: [...salesByBranch.values()]
      .map((branch) => ({
        branchId: branch.branchId,
        branchName: branch.branchName,
        salesTotalMinor: branch.salesTotalMinor,
        estimatedCostMinor: branch.estimatedCostMinor,
        estimatedGrossProfitMinor: safeSubtract(branch.salesTotalMinor, branch.estimatedCostMinor),
        checkpointCount: branch.checkpointIds.size,
        missingCostProductCount: branch.missingCostProducts.size,
      }))
      .sort((left, right) => right.salesTotalMinor - left.salesTotalMinor),
    salesByProduct: [...salesByProduct.values()]
      .map((product) => ({
        ...product,
        estimatedGrossProfitMinor: safeSubtract(
          product.salesTotalMinor,
          product.estimatedCostMinor,
        ),
      }))
      .sort(compareSalesProducts),
    purchasesBySupplier: [...purchasesBySupplier.values()].sort(
      (left, right) => right.totalMinor - left.totalMinor,
    ),
    productionByProduct: [...productionByProduct.values()]
      .map((product) => ({
        productId: product.productId,
        productName: product.productName,
        productKind: product.productKind,
        unitId: product.unitId,
        unitCode: product.unitCode,
        unitName: product.unitName,
        batchCount: product.batchIds.size,
        trayCount: product.trayCount,
        estimatedWeightGrams: product.estimatedWeightGrams,
        measuredWeightGrams: product.measuredWeightGrams,
      }))
      .sort((left, right) => right.estimatedWeightGrams - left.estimatedWeightGrams),
    wasteByProduct: [...wasteByProduct.values()].sort(
      (left, right) =>
        left.productName.localeCompare(right.productName) ||
        left.source.localeCompare(right.source),
    ),
    inventoryByProduct: [...inventoryByProduct.values()].sort(
      (left, right) =>
        left.branchName.localeCompare(right.branchName) ||
        left.productName.localeCompare(right.productName),
    ),
  };
}

function assertBuildInput(input: BuildReportInput): void {
  if (!isValidIsoDate(input.from) || !isValidIsoDate(input.to)) {
    throw new DomainError('INVALID_INPUT', 'The report range must use valid dates');
  }
  if (input.from > input.to) {
    throw new DomainError('INVALID_INPUT', 'The report start date must not be after its end date');
  }
  if (!isReportGranularity(input.granularity)) {
    throw new DomainError('INVALID_INPUT', 'The report granularity must be day, week or month');
  }
  if (input.timezone.trim().length === 0) {
    throw new DomainError('INVALID_INPUT', 'The report timezone must not be empty');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new DomainError('INVALID_INPUT', 'The report currency must be a three-letter code');
  }
}

function enumeratePeriods(
  from: IsoDate,
  to: IsoDate,
  granularity: ReportGranularity,
): readonly { readonly periodStart: IsoDate; readonly periodEnd: IsoDate }[] {
  const periods: { periodStart: IsoDate; periodEnd: IsoDate }[] = [];
  let cursor = periodContaining(from, granularity);

  while (cursor <= to) {
    const next = nextPeriodStart(cursor, granularity);
    const lastDay = addDays(next, -1);
    periods.push({ periodStart: cursor, periodEnd: lastDay < to ? lastDay : to });
    cursor = next;
  }

  return periods;
}

function periodContaining(date: IsoDate, granularity: ReportGranularity): IsoDate {
  if (granularity === 'day') {
    return date;
  }

  if (granularity === 'month') {
    return `${date.slice(0, 7)}-01`;
  }

  const value = new Date(`${date}T00:00:00.000Z`);
  const weekday = value.getUTCDay() === 0 ? 7 : value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - (weekday - 1));
  return value.toISOString().slice(0, 10);
}

function nextPeriodStart(date: IsoDate, granularity: ReportGranularity): IsoDate {
  if (granularity === 'day') {
    return addDays(date, 1);
  }

  if (granularity === 'week') {
    return addDays(date, 7);
  }

  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  return value.toISOString().slice(0, 10);
}

function addDays(date: IsoDate, days: number): IsoDate {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function compareCostLines(left: ReportCostLine, right: ReportCostLine): number {
  return (
    right.deliveryDate.localeCompare(left.deliveryDate) ||
    right.receivedAt.localeCompare(left.receivedAt) ||
    right.purchaseId.localeCompare(left.purchaseId)
  );
}

function latestCostLine(
  lines: readonly ReportCostLine[] | undefined,
  businessDate: IsoDate,
): ReportCostLine | undefined {
  return lines?.find((line) => line.deliveryDate <= businessDate);
}

function compareSalesProducts(left: ReportSalesByProduct, right: ReportSalesByProduct): number {
  return (
    right.salesTotalMinor - left.salesTotalMinor ||
    left.productName.localeCompare(right.productName)
  );
}

function branchProductKey(branchId: BranchId, productId: ProductId): string {
  return `${branchId}:${productId}`;
}

function productUnitKey(productId: ProductId, unitId: MeasurementUnitId): string {
  return `${productId}:${unitId}`;
}

function safeAdd(left: number, right: number): number {
  const total = left + right;
  if (!Number.isSafeInteger(total)) {
    throw new DomainError('INVALID_INPUT', 'The report total is too large');
  }
  return total;
}

function safeSubtract(left: number, right: number): number {
  const total = left - right;
  if (!Number.isSafeInteger(total)) {
    throw new DomainError('INVALID_INPUT', 'The report total is too large');
  }
  return total;
}
