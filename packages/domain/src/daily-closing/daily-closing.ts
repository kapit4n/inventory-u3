/**
 * Daily closing snapshots.
 *
 * A closing is a reviewed copy of one branch's day. It never replaces the
 * transactional records: it freezes what those records said when the operator
 * confirmed the day, including estimated cost and gross profit, so later master
 * data edits cannot rewrite history.
 *
 * Reopening does not mutate the confirmed snapshot. It marks that version
 * REOPENED and creates a new version that points back to it.
 */

import type {
  BranchId,
  DailyClosingId,
  IsoDate,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductId,
  UserId,
} from '@inventory-u3/types';

import type { ProductKind } from '../product/product-kind.js';
import { DomainError } from '../shared/errors.js';
import { isValidIsoDate } from '../shared/time.js';

export const DAILY_CLOSING_STATUSES = ['DRAFT', 'REVIEWED', 'CONFIRMED', 'REOPENED'] as const;

export type DailyClosingStatus = (typeof DAILY_CLOSING_STATUSES)[number];

export const DAILY_CLOSING_COST_BASES = ['LATEST_PURCHASE_PRICE', 'UNAVAILABLE'] as const;

export type DailyClosingCostBasis = (typeof DAILY_CLOSING_COST_BASES)[number];

export type DailyClosingProductKind = ProductKind;

export interface DailyClosingItem {
  readonly productId: ProductId;
  readonly productKind: DailyClosingProductKind;
  readonly unitId: MeasurementUnitId;
  readonly openingQuantityMilli: number;
  readonly purchasedQuantityMilli: number;
  readonly producedQuantityMilli: number;
  readonly soldQuantityMilli: number;
  readonly wasteQuantityMilli: number;
  readonly adjustmentQuantityMilli: number;
  readonly correctionQuantityMilli: number;
  readonly reconciliationDifferenceQuantityMilli: number;
  readonly closingQuantityMilli: number;
  readonly estimatedRevenueMinor: number;
  readonly unitCostAmountMinor?: number;
  readonly costBasis: DailyClosingCostBasis;
  readonly estimatedCostOfSalesMinor: number;
  readonly position: number;
}

export interface DailyClosingReview {
  readonly reviewedByUserId: UserId;
  readonly reviewedAt: IsoDateTime;
}

export interface DailyClosingConfirmation {
  readonly confirmedByUserId: UserId;
  readonly confirmedAt: IsoDateTime;
}

export interface DailyClosingReopening {
  readonly reopenedByUserId: UserId;
  readonly reopenedAt: IsoDateTime;
  readonly reason: string;
}

export interface DailyClosing {
  readonly id: DailyClosingId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly version: number;
  readonly previousClosingId?: DailyClosingId;
  readonly status: DailyClosingStatus;
  readonly currency: string;
  readonly purchasesTotalMinor: number;
  readonly purchaseCount: number;
  readonly unreceivedPurchaseCount: number;
  readonly productionBatchCount: number;
  readonly productionDraftCount: number;
  readonly productionTrayCount: number;
  readonly productionEstimatedWeightGrams: number;
  readonly salesCheckpointCount: number;
  readonly draftSalesCheckpointCount: number;
  readonly salesTotalMinor: number;
  readonly wasteRecordCount: number;
  readonly inventoryDifferenceProductCount: number;
  readonly estimatedRevenueMinor: number;
  readonly estimatedCostMinor: number;
  readonly estimatedGrossProfitMinor: number;
  readonly missingCostProductCount: number;
  readonly negativeStockProductCount: number;
  readonly createdByUserId: UserId;
  readonly reviewedByUserId?: UserId;
  readonly reviewedAt?: IsoDateTime;
  readonly confirmedByUserId?: UserId;
  readonly confirmedAt?: IsoDateTime;
  readonly reopenedByUserId?: UserId;
  readonly reopenedAt?: IsoDateTime;
  readonly reopenReason?: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly items: readonly DailyClosingItem[];
}

export interface DailyClosingStockLine {
  readonly productId: ProductId;
  readonly productKind: DailyClosingProductKind;
  readonly unitId: MeasurementUnitId;
  readonly openingQuantityMilli: number;
  readonly movementQuantityMilli: number;
  readonly purchasedQuantityMilli: number;
  readonly producedQuantityMilli: number;
  readonly wasteQuantityMilli: number;
  readonly adjustmentQuantityMilli: number;
  readonly correctionQuantityMilli: number;
}

export interface DailyClosingSalesLine {
  readonly productId: ProductId;
  readonly productKind: DailyClosingProductKind;
  readonly unitId: MeasurementUnitId;
  readonly quantityMilli: number;
  readonly revenueMinor: number;
}

export interface DailyClosingCostLine {
  readonly productId: ProductId;
  readonly unitId: MeasurementUnitId;
  readonly unitPriceMinor: number;
  readonly deliveryDate: IsoDate;
  readonly receivedAt: IsoDateTime;
  readonly purchaseId: string;
}

export interface DailyClosingReconciliationLine {
  readonly productId: ProductId;
  readonly quantityDeltaMilli: number;
}

export interface DailyClosingSources {
  readonly stockLines: readonly DailyClosingStockLine[];
  readonly salesLines: readonly DailyClosingSalesLine[];
  readonly costLines: readonly DailyClosingCostLine[];
  readonly reconciliations: readonly DailyClosingReconciliationLine[];
  readonly purchasesTotalMinor: number;
  readonly purchaseCount: number;
  readonly unreceivedPurchaseCount: number;
  readonly productionBatchCount: number;
  readonly productionDraftCount: number;
  readonly productionTrayCount: number;
  readonly productionEstimatedWeightGrams: number;
  readonly salesCheckpointCount: number;
  readonly draftSalesCheckpointCount: number;
  readonly wasteRecordCount: number;
}

export interface NewDailyClosing {
  readonly id: DailyClosingId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly version: number;
  readonly previousClosingId?: DailyClosingId;
  readonly currency: string;
  readonly createdByUserId: UserId;
  readonly sources: DailyClosingSources;
}

const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const REASON_MAX_LENGTH = 500;

export function isDailyClosingStatus(value: unknown): value is DailyClosingStatus {
  return typeof value === 'string' && (DAILY_CLOSING_STATUSES as readonly string[]).includes(value);
}

export function createDailyClosing(input: NewDailyClosing, now: IsoDateTime): DailyClosing {
  if (!isValidIsoDate(input.businessDate)) {
    throw new DomainError('INVALID_INPUT', 'Daily closing business date is not a valid date');
  }

  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new DomainError('INVALID_INPUT', 'Daily closing version must be a positive integer');
  }

  if (!CURRENCY_PATTERN.test(input.currency)) {
    throw new DomainError('INVALID_INPUT', 'Daily closing currency must be a three-letter code');
  }

  const { sources } = input;
  const {
    purchasesTotalMinor,
    purchaseCount,
    unreceivedPurchaseCount,
    productionBatchCount,
    productionDraftCount,
    productionTrayCount,
    productionEstimatedWeightGrams,
    salesCheckpointCount,
    draftSalesCheckpointCount,
    wasteRecordCount,
  } = sources;

  for (const [label, value] of [
    ['Purchases total', purchasesTotalMinor],
    ['Purchase count', purchaseCount],
    ['Unreceived purchase count', unreceivedPurchaseCount],
    ['Production batch count', productionBatchCount],
    ['Production draft count', productionDraftCount],
    ['Production tray count', productionTrayCount],
    ['Production estimated weight', productionEstimatedWeightGrams],
    ['Sales checkpoint count', salesCheckpointCount],
    ['Draft sales checkpoint count', draftSalesCheckpointCount],
    ['Waste record count', wasteRecordCount],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new DomainError('INVALID_INPUT', `${label} must be a non-negative integer`);
    }
  }

  const products = collectProducts(sources);
  const latestCostByProduct = latestCostLines(sources.costLines);

  const items = products
    .map((entry) => buildItem(entry, latestCostByProduct, sources.reconciliations))
    .sort((left, right) => left.productId.localeCompare(right.productId))
    .map((item, index) => ({ ...item, position: index + 1 }));

  const salesTotalMinor = items.reduce((total, item) => total + item.estimatedRevenueMinor, 0);
  const estimatedCostMinor = items.reduce(
    (total, item) => total + item.estimatedCostOfSalesMinor,
    0,
  );
  const estimatedGrossProfitMinor = salesTotalMinor - estimatedCostMinor;
  const missingCostProductCount = items.filter(
    (item) => item.soldQuantityMilli > 0 && item.costBasis === 'UNAVAILABLE',
  ).length;
  const negativeStockProductCount = items.filter((item) => item.closingQuantityMilli < 0).length;
  const inventoryDifferenceProductCount = new Set(
    sources.reconciliations
      .filter((line) => line.quantityDeltaMilli !== 0)
      .map((line) => line.productId),
  ).size;

  if (salesTotalMinor !== safeSum(sources.salesLines.map((line) => line.revenueMinor))) {
    throw new DomainError('INVALID_INPUT', 'Sales snapshot total does not match its lines');
  }

  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    businessDate: input.businessDate,
    version: input.version,
    ...(input.previousClosingId === undefined
      ? {}
      : { previousClosingId: input.previousClosingId }),
    status: 'DRAFT',
    currency: input.currency,
    purchasesTotalMinor,
    purchaseCount,
    unreceivedPurchaseCount,
    productionBatchCount,
    productionDraftCount,
    productionTrayCount,
    productionEstimatedWeightGrams,
    salesCheckpointCount,
    draftSalesCheckpointCount,
    salesTotalMinor,
    wasteRecordCount,
    inventoryDifferenceProductCount,
    estimatedRevenueMinor: salesTotalMinor,
    estimatedCostMinor,
    estimatedGrossProfitMinor,
    missingCostProductCount,
    negativeStockProductCount,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
    items: Object.freeze(items),
  });
}

export function reviewDailyClosing(
  dailyClosing: DailyClosing,
  review: DailyClosingReview,
): DailyClosing {
  if (dailyClosing.status !== 'DRAFT') {
    throw new DomainError('INVALID_STATE', 'Only a draft daily closing can be reviewed', {
      status: dailyClosing.status,
    });
  }

  return {
    ...dailyClosing,
    status: 'REVIEWED',
    reviewedByUserId: review.reviewedByUserId,
    reviewedAt: review.reviewedAt,
    updatedAt: review.reviewedAt,
  };
}

export function confirmDailyClosing(
  dailyClosing: DailyClosing,
  confirmation: DailyClosingConfirmation,
): DailyClosing {
  if (dailyClosing.status !== 'DRAFT' && dailyClosing.status !== 'REVIEWED') {
    throw new DomainError(
      'INVALID_STATE',
      'Only a draft or reviewed daily closing can be confirmed',
      { status: dailyClosing.status },
    );
  }

  return {
    ...dailyClosing,
    status: 'CONFIRMED',
    confirmedByUserId: confirmation.confirmedByUserId,
    confirmedAt: confirmation.confirmedAt,
    updatedAt: confirmation.confirmedAt,
  };
}

export function reopenDailyClosing(
  dailyClosing: DailyClosing,
  reopening: DailyClosingReopening,
): DailyClosing {
  if (dailyClosing.status !== 'CONFIRMED') {
    throw new DomainError('INVALID_STATE', 'Only a confirmed daily closing can be reopened', {
      status: dailyClosing.status,
    });
  }

  const reason = reopening.reason.trim();
  if (reason.length === 0 || reason.length > REASON_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Reopen reason must be between 1 and ${REASON_MAX_LENGTH} characters`,
    );
  }

  return {
    ...dailyClosing,
    status: 'REOPENED',
    reopenedByUserId: reopening.reopenedByUserId,
    reopenedAt: reopening.reopenedAt,
    reopenReason: reason,
    updatedAt: reopening.reopenedAt,
  };
}

interface ProductEntry {
  readonly productId: ProductId;
  readonly productKind: DailyClosingProductKind;
  readonly unitId: MeasurementUnitId;
  readonly stock?: DailyClosingStockLine;
  readonly sales?: DailyClosingSalesLine;
}

function collectProducts(sources: DailyClosingSources): readonly ProductEntry[] {
  const products = new Map<ProductId, ProductEntry>();

  for (const line of sources.stockLines) {
    assertQuantity(line.openingQuantityMilli, 'Opening quantity');
    assertQuantity(line.movementQuantityMilli, 'Movement quantity');
    assertQuantity(line.purchasedQuantityMilli, 'Purchased quantity');
    assertQuantity(line.producedQuantityMilli, 'Produced quantity');
    assertQuantity(line.wasteQuantityMilli, 'Waste quantity');
    assertQuantity(line.adjustmentQuantityMilli, 'Adjustment quantity');
    assertQuantity(line.correctionQuantityMilli, 'Correction quantity');
    products.set(line.productId, {
      productId: line.productId,
      productKind: line.productKind,
      unitId: line.unitId,
      stock: line,
    });
  }

  for (const line of sources.salesLines) {
    assertQuantity(line.quantityMilli, 'Sold quantity');
    if (!Number.isSafeInteger(line.revenueMinor) || line.revenueMinor < 0) {
      throw new DomainError('INVALID_INPUT', 'Sales line revenue must be a non-negative integer');
    }

    const existing = products.get(line.productId);
    if (existing) {
      if (existing.unitId !== line.unitId || existing.productKind !== line.productKind) {
        throw new DomainError(
          'INVALID_INPUT',
          'The same product cannot have conflicting units or kinds in one closing',
          { productId: line.productId },
        );
      }
      products.set(line.productId, { ...existing, sales: line });
    } else {
      products.set(line.productId, {
        productId: line.productId,
        productKind: line.productKind,
        unitId: line.unitId,
        sales: line,
      });
    }
  }

  return [...products.values()];
}

function buildItem(
  entry: ProductEntry,
  latestCostByProduct: ReadonlyMap<ProductId, DailyClosingCostLine>,
  reconciliations: readonly DailyClosingReconciliationLine[],
): Omit<DailyClosingItem, 'position'> {
  const stock = entry.stock;
  const sales = entry.sales;
  const soldQuantityMilli = sales?.quantityMilli ?? 0;
  const estimatedRevenueMinor = sales?.revenueMinor ?? 0;
  const reconciliationDifferenceQuantityMilli = reconciliations
    .filter((line) => line.productId === entry.productId)
    .reduce((total, line) => total + line.quantityDeltaMilli, 0);

  const candidate = latestCostByProduct.get(entry.productId);
  const hasCost =
    soldQuantityMilli > 0 && candidate !== undefined && candidate.unitId === entry.unitId;
  const estimatedCostOfSalesMinor = hasCost
    ? roundMilliAmount(soldQuantityMilli, candidate.unitPriceMinor)
    : 0;

  return {
    productId: entry.productId,
    productKind: entry.productKind,
    unitId: entry.unitId,
    openingQuantityMilli: stock?.openingQuantityMilli ?? 0,
    purchasedQuantityMilli: stock?.purchasedQuantityMilli ?? 0,
    producedQuantityMilli: stock?.producedQuantityMilli ?? 0,
    soldQuantityMilli,
    wasteQuantityMilli: stock?.wasteQuantityMilli ?? 0,
    adjustmentQuantityMilli: stock?.adjustmentQuantityMilli ?? 0,
    correctionQuantityMilli: stock?.correctionQuantityMilli ?? 0,
    reconciliationDifferenceQuantityMilli,
    closingQuantityMilli: (stock?.openingQuantityMilli ?? 0) + (stock?.movementQuantityMilli ?? 0),
    estimatedRevenueMinor,
    ...(hasCost ? { unitCostAmountMinor: candidate.unitPriceMinor } : {}),
    costBasis: hasCost ? 'LATEST_PURCHASE_PRICE' : 'UNAVAILABLE',
    estimatedCostOfSalesMinor,
  };
}

function latestCostLines(
  costLines: readonly DailyClosingCostLine[],
): ReadonlyMap<ProductId, DailyClosingCostLine> {
  const sorted = [...costLines].sort((left, right) => {
    const byDate = right.deliveryDate.localeCompare(left.deliveryDate);
    if (byDate !== 0) {
      return byDate;
    }
    const byReceived = right.receivedAt.localeCompare(left.receivedAt);
    return byReceived !== 0 ? byReceived : right.purchaseId.localeCompare(left.purchaseId);
  });

  const latest = new Map<ProductId, DailyClosingCostLine>();
  for (const line of sorted) {
    if (!latest.has(line.productId)) {
      latest.set(line.productId, line);
    }
  }
  return latest;
}

function assertQuantity(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new DomainError('INVALID_INPUT', `${label} must be a whole thousandth quantity`);
  }
}

function safeSum(values: readonly number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(total)) {
    throw new DomainError('INVALID_INPUT', 'Daily closing total is too large');
  }
  return total;
}

export function roundMilliAmount(quantityMilli: number, unitAmountMinor: number): number {
  if (
    !Number.isSafeInteger(quantityMilli) ||
    quantityMilli < 0 ||
    !Number.isSafeInteger(unitAmountMinor) ||
    unitAmountMinor < 0
  ) {
    throw new DomainError('INVALID_INPUT', 'Cost inputs must be non-negative integers');
  }

  const rounded = Math.floor((quantityMilli * unitAmountMinor + 500) / 1000);
  if (!Number.isSafeInteger(rounded)) {
    throw new DomainError('INVALID_INPUT', 'Estimated cost is too large');
  }
  return rounded;
}
