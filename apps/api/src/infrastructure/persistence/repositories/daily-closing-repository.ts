import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';

import {
  dailyClosingItems,
  dailyClosings,
  inventoryWaste,
  productionBatches,
  productionOutputs,
  products,
  purchaseItems,
  purchases,
  salesCheckpointItems,
  salesCheckpoints,
  stockAdjustments,
  stockMovements,
} from '@inventory-u3/database/schema';
import type {
  DailyClosing,
  DailyClosingConfirmation,
  DailyClosingItem,
  DailyClosingRepository,
  DailyClosingReopening,
  DailyClosingReview,
  DailyClosingSources,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asDailyClosingId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asUserId,
  type BranchId,
  type DailyClosingId,
  type IsoDate,
  type IsoDateTime,
  type OrganizationId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type ClosingRow = typeof dailyClosings.$inferSelect;
type ItemRow = typeof dailyClosingItems.$inferSelect;

export class DrizzleDailyClosingRepository implements DailyClosingRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
  ): Promise<DailyClosing | undefined> {
    const [row] = await this.db
      .select()
      .from(dailyClosings)
      .where(
        and(eq(dailyClosings.organizationId, organizationId), eq(dailyClosings.id, dailyClosingId)),
      )
      .limit(1);

    return row
      ? toDailyClosing(
          row,
          (await this.itemsFor(organizationId, [row.id])).map((entry) => entry.value),
        )
      : undefined;
  }

  async findCurrent(
    organizationId: OrganizationId,
    branchId: BranchId,
    businessDate: IsoDate,
  ): Promise<DailyClosing | undefined> {
    const [row] = await this.db
      .select()
      .from(dailyClosings)
      .where(
        and(
          eq(dailyClosings.organizationId, organizationId),
          eq(dailyClosings.branchId, branchId),
          eq(dailyClosings.businessDate, businessDate),
        ),
      )
      .orderBy(desc(dailyClosings.version))
      .limit(1);

    return row
      ? toDailyClosing(
          row,
          (await this.itemsFor(organizationId, [row.id])).map((entry) => entry.value),
        )
      : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly DailyClosing[]> {
    const rows = await this.db
      .select()
      .from(dailyClosings)
      .where(eq(dailyClosings.organizationId, organizationId))
      .orderBy(
        desc(dailyClosings.businessDate),
        desc(dailyClosings.version),
        desc(dailyClosings.createdAt),
      );
    return this.withItems(organizationId, rows);
  }

  async listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly DailyClosing[]> {
    const rows = await this.db
      .select()
      .from(dailyClosings)
      .where(
        and(eq(dailyClosings.organizationId, organizationId), eq(dailyClosings.branchId, branchId)),
      )
      .orderBy(
        desc(dailyClosings.businessDate),
        desc(dailyClosings.version),
        desc(dailyClosings.createdAt),
      );
    return this.withItems(organizationId, rows);
  }

  async readSources(
    organizationId: OrganizationId,
    branchId: BranchId,
    businessDate: IsoDate,
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
  ): Promise<DailyClosingSources> {
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    const stockRows = await this.db
      .select({
        productId: stockMovements.productId,
        productKind: products.kind,
        unitId: products.inventoryUnitId,
        opening: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} < ${start} then ${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
        movement: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} >= ${start} and ${stockMovements.occurredAt} < ${end} then ${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
        purchased: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} >= ${start} and ${stockMovements.occurredAt} < ${end} and ${stockMovements.reason} = 'RECEIVING' then ${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
        produced: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} >= ${start} and ${stockMovements.occurredAt} < ${end} and ${stockMovements.reason} = 'PRODUCTION_OUTPUT' then ${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
        waste: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} >= ${start} and ${stockMovements.occurredAt} < ${end} and ${stockMovements.reason} = 'WASTE' then -${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
        adjustment: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} >= ${start} and ${stockMovements.occurredAt} < ${end} and ${stockMovements.reason} = 'ADJUSTMENT' then ${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
        correction: sql<number>`coalesce(sum(case when ${stockMovements.occurredAt} >= ${start} and ${stockMovements.occurredAt} < ${end} and ${stockMovements.reason} = 'CORRECTION' then ${stockMovements.quantityDeltaMilli} else 0 end), 0)::int`,
      })
      .from(stockMovements)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, stockMovements.organizationId),
          eq(products.id, stockMovements.productId),
        ),
      )
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          eq(stockMovements.branchId, branchId),
          lt(stockMovements.occurredAt, end),
        ),
      )
      .groupBy(stockMovements.productId, products.kind, products.inventoryUnitId)
      .orderBy(asc(stockMovements.productId));

    const salesRows = await this.db
      .select({
        productId: salesCheckpointItems.productId,
        productKind: salesCheckpointItems.productKind,
        unitId: salesCheckpointItems.unitId,
        quantityMilli: sql<number>`coalesce(sum(${salesCheckpointItems.quantityMilli}), 0)::int`,
        revenueMinor: sql<number>`coalesce(sum(${salesCheckpointItems.estimatedSalesValueMinor}), 0)::int`,
      })
      .from(salesCheckpointItems)
      .innerJoin(
        salesCheckpoints,
        and(
          eq(salesCheckpoints.organizationId, salesCheckpointItems.organizationId),
          eq(salesCheckpoints.id, salesCheckpointItems.checkpointId),
        ),
      )
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.branchId, branchId),
          eq(salesCheckpoints.businessDate, businessDate),
          eq(salesCheckpoints.status, 'CONFIRMED'),
        ),
      )
      .groupBy(
        salesCheckpointItems.productId,
        salesCheckpointItems.productKind,
        salesCheckpointItems.unitId,
      );

    const costRows = await this.db
      .select({
        productId: purchaseItems.productId,
        unitId: purchaseItems.unitId,
        unitPriceMinor: purchaseItems.unitPriceMinor,
        deliveryDate: purchases.deliveryDate,
        receivedAt: purchases.receivedAt,
        purchaseId: purchases.id,
      })
      .from(purchaseItems)
      .innerJoin(
        purchases,
        and(
          eq(purchases.organizationId, purchaseItems.organizationId),
          eq(purchases.id, purchaseItems.purchaseId),
        ),
      )
      .where(
        and(
          eq(purchases.organizationId, organizationId),
          eq(purchases.branchId, branchId),
          eq(purchases.status, 'RECEIVED'),
          sql`${purchases.deliveryDate} <= ${businessDate}`,
        ),
      )
      .orderBy(desc(purchases.deliveryDate), desc(purchases.receivedAt), desc(purchases.id));

    const reconciliationRows = await this.db
      .select({
        productId: stockAdjustments.productId,
        quantityDeltaMilli: stockAdjustments.quantityDeltaMilli,
      })
      .from(stockAdjustments)
      .where(
        and(
          eq(stockAdjustments.organizationId, organizationId),
          eq(stockAdjustments.branchId, branchId),
          eq(stockAdjustments.kind, 'RECONCILIATION'),
          gte(stockAdjustments.occurredAt, start),
          lt(stockAdjustments.occurredAt, end),
        ),
      );

    const purchaseRows = await this.db
      .select({
        id: purchases.id,
        status: purchases.status,
        totalMinor: purchases.totalMinor,
        deliveryDate: purchases.deliveryDate,
        receivedAt: purchases.receivedAt,
      })
      .from(purchases)
      .where(and(eq(purchases.organizationId, organizationId), eq(purchases.branchId, branchId)));

    const productionRows = await this.db
      .select({
        id: productionBatches.id,
        status: productionBatches.status,
      })
      .from(productionBatches)
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.branchId, branchId),
          eq(productionBatches.businessDate, businessDate),
        ),
      );

    const productionOutputRows = await this.db
      .select({
        trayCount: productionOutputs.trayCount,
        estimatedWeightGrams: productionOutputs.estimatedWeightGrams,
      })
      .from(productionOutputs)
      .innerJoin(
        productionBatches,
        and(
          eq(productionBatches.organizationId, productionOutputs.organizationId),
          eq(productionBatches.id, productionOutputs.batchId),
        ),
      )
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.branchId, branchId),
          eq(productionBatches.businessDate, businessDate),
          eq(productionBatches.status, 'CONFIRMED'),
        ),
      );

    const checkpointRows = await this.db
      .select({ id: salesCheckpoints.id, status: salesCheckpoints.status })
      .from(salesCheckpoints)
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.branchId, branchId),
          eq(salesCheckpoints.businessDate, businessDate),
        ),
      );

    const wasteRows = await this.db
      .select({ id: inventoryWaste.id })
      .from(inventoryWaste)
      .where(
        and(
          eq(inventoryWaste.organizationId, organizationId),
          eq(inventoryWaste.branchId, branchId),
          gte(inventoryWaste.occurredAt, start),
          lt(inventoryWaste.occurredAt, end),
        ),
      );

    const receivedPurchases = purchaseRows.filter(
      (row) =>
        row.status === 'RECEIVED' &&
        row.receivedAt !== null &&
        row.receivedAt.getTime() >= start.getTime() &&
        row.receivedAt.getTime() < end.getTime(),
    );

    return {
      stockLines: stockRows.map((row) => ({
        productId: asProductId(row.productId),
        productKind: row.productKind,
        unitId: asMeasurementUnitId(row.unitId),
        openingQuantityMilli: Number(row.opening),
        movementQuantityMilli: Number(row.movement),
        purchasedQuantityMilli: Number(row.purchased),
        producedQuantityMilli: Number(row.produced),
        wasteQuantityMilli: Number(row.waste),
        adjustmentQuantityMilli: Number(row.adjustment),
        correctionQuantityMilli: Number(row.correction),
      })),
      salesLines: salesRows.map((row) => ({
        productId: asProductId(row.productId),
        productKind: row.productKind,
        unitId: asMeasurementUnitId(row.unitId),
        quantityMilli: Number(row.quantityMilli),
        revenueMinor: Number(row.revenueMinor),
      })),
      costLines: costRows
        .filter((row) => row.receivedAt !== null)
        .map((row) => ({
          productId: asProductId(row.productId),
          unitId: asMeasurementUnitId(row.unitId),
          unitPriceMinor: row.unitPriceMinor,
          deliveryDate: row.deliveryDate,
          receivedAt: row.receivedAt!.toISOString(),
          purchaseId: row.purchaseId,
        })),
      reconciliations: reconciliationRows.map((row) => ({
        productId: asProductId(row.productId),
        quantityDeltaMilli: row.quantityDeltaMilli,
      })),
      purchasesTotalMinor: receivedPurchases.reduce((total, row) => total + row.totalMinor, 0),
      purchaseCount: receivedPurchases.length,
      unreceivedPurchaseCount: purchaseRows.filter(
        (row) => row.status === 'DRAFT' && row.deliveryDate <= businessDate,
      ).length,
      productionBatchCount: productionRows.filter((row) => row.status === 'CONFIRMED').length,
      productionDraftCount: productionRows.filter((row) => row.status === 'DRAFT').length,
      productionTrayCount: productionOutputRows.reduce((total, row) => total + row.trayCount, 0),
      productionEstimatedWeightGrams: productionOutputRows.reduce(
        (total, row) => total + row.estimatedWeightGrams,
        0,
      ),
      salesCheckpointCount: checkpointRows.filter((row) => row.status === 'CONFIRMED').length,
      draftSalesCheckpointCount: checkpointRows.filter((row) => row.status === 'DRAFT').length,
      wasteRecordCount: wasteRows.length,
    };
  }

  async create(dailyClosing: DailyClosing): Promise<DailyClosing> {
    await this.db.insert(dailyClosings).values(toClosingInsert(dailyClosing));
    if (dailyClosing.items.length > 0) {
      await this.db.insert(dailyClosingItems).values(
        dailyClosing.items.map((item) => ({
          ...toItemInsert(item, dailyClosing.organizationId, dailyClosing.id),
          createdAt: new Date(dailyClosing.createdAt),
        })),
      );
    }
    const saved = await this.findById(dailyClosing.organizationId, dailyClosing.id);
    if (!saved) {
      throw new Error('Daily closing could not be read after insert');
    }
    return saved;
  }

  async markReviewed(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
    review: DailyClosingReview,
  ): Promise<DailyClosing | undefined> {
    const [row] = await this.db
      .update(dailyClosings)
      .set({
        status: 'REVIEWED',
        reviewedByUserId: review.reviewedByUserId,
        reviewedAt: new Date(review.reviewedAt),
        updatedAt: new Date(review.reviewedAt),
      })
      .where(
        and(
          eq(dailyClosings.organizationId, organizationId),
          eq(dailyClosings.id, dailyClosingId),
          eq(dailyClosings.status, 'DRAFT'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, dailyClosingId) : undefined;
  }

  async markConfirmed(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
    confirmation: DailyClosingConfirmation,
  ): Promise<DailyClosing | undefined> {
    const [row] = await this.db
      .update(dailyClosings)
      .set({
        status: 'CONFIRMED',
        confirmedByUserId: confirmation.confirmedByUserId,
        confirmedAt: new Date(confirmation.confirmedAt),
        updatedAt: new Date(confirmation.confirmedAt),
      })
      .where(
        and(
          eq(dailyClosings.organizationId, organizationId),
          eq(dailyClosings.id, dailyClosingId),
          inArray(dailyClosings.status, ['DRAFT', 'REVIEWED']),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, dailyClosingId) : undefined;
  }

  async markReopened(
    organizationId: OrganizationId,
    dailyClosingId: DailyClosingId,
    reopening: DailyClosingReopening,
  ): Promise<DailyClosing | undefined> {
    const [row] = await this.db
      .update(dailyClosings)
      .set({
        status: 'REOPENED',
        reopenedByUserId: reopening.reopenedByUserId,
        reopenedAt: new Date(reopening.reopenedAt),
        reopenReason: reopening.reason,
        updatedAt: new Date(reopening.reopenedAt),
      })
      .where(
        and(
          eq(dailyClosings.organizationId, organizationId),
          eq(dailyClosings.id, dailyClosingId),
          eq(dailyClosings.status, 'CONFIRMED'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, dailyClosingId) : undefined;
  }

  private async withItems(
    organizationId: OrganizationId,
    rows: readonly ClosingRow[],
  ): Promise<readonly DailyClosing[]> {
    if (rows.length === 0) {
      return [];
    }
    const items = await this.itemsFor(
      organizationId,
      rows.map((row) => row.id),
    );
    const byClosing = new Map<string, DailyClosingItem[]>();
    for (const item of items) {
      const list = byClosing.get(item.closingId) ?? [];
      list.push(item.value);
      byClosing.set(item.closingId, list);
    }
    return rows.map((row) => toDailyClosing(row, byClosing.get(row.id) ?? []));
  }

  private async itemsFor(
    organizationId: OrganizationId,
    closingIds: readonly string[],
  ): Promise<readonly { readonly closingId: string; readonly value: DailyClosingItem }[]> {
    if (closingIds.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(dailyClosingItems)
      .where(
        and(
          eq(dailyClosingItems.organizationId, organizationId),
          inArray(dailyClosingItems.dailyClosingId, closingIds),
        ),
      )
      .orderBy(asc(dailyClosingItems.position), asc(dailyClosingItems.productId));
    return rows.map((row) => ({ closingId: row.dailyClosingId, value: toDailyClosingItem(row) }));
  }
}

function toClosingInsert(closing: DailyClosing): typeof dailyClosings.$inferInsert {
  return {
    id: closing.id,
    organizationId: closing.organizationId,
    branchId: closing.branchId,
    businessDate: closing.businessDate,
    version: closing.version,
    previousClosingId: closing.previousClosingId ?? null,
    status: closing.status,
    currency: closing.currency,
    purchasesTotalMinor: closing.purchasesTotalMinor,
    purchaseCount: closing.purchaseCount,
    unreceivedPurchaseCount: closing.unreceivedPurchaseCount,
    productionBatchCount: closing.productionBatchCount,
    productionDraftCount: closing.productionDraftCount,
    productionTrayCount: closing.productionTrayCount,
    productionEstimatedWeightGrams: closing.productionEstimatedWeightGrams,
    salesCheckpointCount: closing.salesCheckpointCount,
    draftSalesCheckpointCount: closing.draftSalesCheckpointCount,
    salesTotalMinor: closing.salesTotalMinor,
    wasteRecordCount: closing.wasteRecordCount,
    inventoryDifferenceProductCount: closing.inventoryDifferenceProductCount,
    estimatedRevenueMinor: closing.estimatedRevenueMinor,
    estimatedCostMinor: closing.estimatedCostMinor,
    estimatedGrossProfitMinor: closing.estimatedGrossProfitMinor,
    missingCostProductCount: closing.missingCostProductCount,
    negativeStockProductCount: closing.negativeStockProductCount,
    createdByUserId: closing.createdByUserId,
    reviewedByUserId: closing.reviewedByUserId ?? null,
    reviewedAt: toDate(closing.reviewedAt),
    confirmedByUserId: closing.confirmedByUserId ?? null,
    confirmedAt: toDate(closing.confirmedAt),
    reopenedByUserId: closing.reopenedByUserId ?? null,
    reopenedAt: toDate(closing.reopenedAt),
    reopenReason: closing.reopenReason ?? null,
    createdAt: new Date(closing.createdAt),
    updatedAt: new Date(closing.updatedAt),
  };
}

function toDailyClosing(row: ClosingRow, items: readonly DailyClosingItem[]): DailyClosing {
  return {
    id: asDailyClosingId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    businessDate: row.businessDate,
    version: row.version,
    ...(row.previousClosingId === null
      ? {}
      : { previousClosingId: asDailyClosingId(row.previousClosingId) }),
    status: row.status,
    currency: row.currency,
    purchasesTotalMinor: row.purchasesTotalMinor,
    purchaseCount: row.purchaseCount,
    unreceivedPurchaseCount: row.unreceivedPurchaseCount,
    productionBatchCount: row.productionBatchCount,
    productionDraftCount: row.productionDraftCount,
    productionTrayCount: row.productionTrayCount,
    productionEstimatedWeightGrams: row.productionEstimatedWeightGrams,
    salesCheckpointCount: row.salesCheckpointCount,
    draftSalesCheckpointCount: row.draftSalesCheckpointCount,
    salesTotalMinor: row.salesTotalMinor,
    wasteRecordCount: row.wasteRecordCount,
    inventoryDifferenceProductCount: row.inventoryDifferenceProductCount,
    estimatedRevenueMinor: row.estimatedRevenueMinor,
    estimatedCostMinor: row.estimatedCostMinor,
    estimatedGrossProfitMinor: row.estimatedGrossProfitMinor,
    missingCostProductCount: row.missingCostProductCount,
    negativeStockProductCount: row.negativeStockProductCount,
    createdByUserId: asUserId(row.createdByUserId),
    ...(row.reviewedByUserId === null ? {} : { reviewedByUserId: asUserId(row.reviewedByUserId) }),
    ...(row.reviewedAt === null ? {} : { reviewedAt: row.reviewedAt.toISOString() }),
    ...(row.confirmedByUserId === null
      ? {}
      : { confirmedByUserId: asUserId(row.confirmedByUserId) }),
    ...(row.confirmedAt === null ? {} : { confirmedAt: row.confirmedAt.toISOString() }),
    ...(row.reopenedByUserId === null ? {} : { reopenedByUserId: asUserId(row.reopenedByUserId) }),
    ...(row.reopenedAt === null ? {} : { reopenedAt: row.reopenedAt.toISOString() }),
    ...(row.reopenReason === null ? {} : { reopenReason: row.reopenReason }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items,
  };
}

function toItemInsert(
  item: DailyClosingItem,
  organizationId: OrganizationId,
  dailyClosingId: DailyClosingId,
): typeof dailyClosingItems.$inferInsert {
  return {
    organizationId,
    dailyClosingId,
    productId: item.productId,
    productKind: item.productKind,
    unitId: item.unitId,
    openingQuantityMilli: item.openingQuantityMilli,
    purchasedQuantityMilli: item.purchasedQuantityMilli,
    producedQuantityMilli: item.producedQuantityMilli,
    soldQuantityMilli: item.soldQuantityMilli,
    wasteQuantityMilli: item.wasteQuantityMilli,
    adjustmentQuantityMilli: item.adjustmentQuantityMilli,
    correctionQuantityMilli: item.correctionQuantityMilli,
    reconciliationDifferenceQuantityMilli: item.reconciliationDifferenceQuantityMilli,
    closingQuantityMilli: item.closingQuantityMilli,
    estimatedRevenueMinor: item.estimatedRevenueMinor,
    unitCostAmountMinor: item.unitCostAmountMinor ?? null,
    costBasis: item.costBasis,
    estimatedCostOfSalesMinor: item.estimatedCostOfSalesMinor,
    position: item.position,
  };
}

function toDailyClosingItem(row: ItemRow): DailyClosingItem {
  return {
    productId: asProductId(row.productId),
    productKind: row.productKind,
    unitId: asMeasurementUnitId(row.unitId),
    openingQuantityMilli: row.openingQuantityMilli,
    purchasedQuantityMilli: row.purchasedQuantityMilli,
    producedQuantityMilli: row.producedQuantityMilli,
    soldQuantityMilli: row.soldQuantityMilli,
    wasteQuantityMilli: row.wasteQuantityMilli,
    adjustmentQuantityMilli: row.adjustmentQuantityMilli,
    correctionQuantityMilli: row.correctionQuantityMilli,
    reconciliationDifferenceQuantityMilli: row.reconciliationDifferenceQuantityMilli,
    closingQuantityMilli: row.closingQuantityMilli,
    estimatedRevenueMinor: row.estimatedRevenueMinor,
    ...(row.unitCostAmountMinor === null ? {} : { unitCostAmountMinor: row.unitCostAmountMinor }),
    costBasis: row.costBasis,
    estimatedCostOfSalesMinor: row.estimatedCostOfSalesMinor,
    position: row.position,
  };
}

function toDate(value: IsoDateTime | undefined): Date | null {
  return value === undefined ? null : new Date(value);
}
