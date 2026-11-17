import { and, asc, eq, gte, lt, lte, sql, type SQL } from 'drizzle-orm';

import {
  branches,
  inventoryWaste,
  measurementUnits,
  productionBatches,
  productionOutputs,
  productionWaste,
  products,
  purchaseItems,
  purchases,
  salesCheckpointItems,
  salesCheckpoints,
  stockMovements,
  suppliers,
} from '@inventory-u3/database/schema';
import type { ReportQuery, ReportRepository, ReportSource } from '@inventory-u3/domain';
import {
  asBranchId,
  asMeasurementUnitId,
  asProductId,
  asProductionBatchId,
  asSalesCheckpointId,
  asSupplierId,
  type IsoDateTime,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

export class DrizzleReportRepository implements ReportRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async readSources(
    organizationId: ReportQuery['organizationId'],
    query: ReportQuery,
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
  ): Promise<ReportSource> {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const branch = query.branchId;

    const branchRows = await this.db
      .select({ id: branches.id, name: branches.name })
      .from(branches)
      .where(
        and(
          eq(branches.organizationId, organizationId),
          ...(branch === undefined ? [] : [eq(branches.id, branch)]),
        ),
      )
      .orderBy(asc(branches.name));

    const salesConditions: SQL[] = [
      eq(salesCheckpoints.organizationId, organizationId),
      eq(salesCheckpoints.status, 'CONFIRMED'),
      gte(salesCheckpoints.businessDate, query.from),
      lte(salesCheckpoints.businessDate, query.to),
    ];
    if (branch !== undefined) {
      salesConditions.push(eq(salesCheckpoints.branchId, branch));
    }

    const salesRows = await this.db
      .select({
        checkpointId: salesCheckpoints.id,
        branchId: salesCheckpoints.branchId,
        businessDate: salesCheckpoints.businessDate,
        productId: salesCheckpointItems.productId,
        productName: products.name,
        productKind: salesCheckpointItems.productKind,
        unitId: salesCheckpointItems.unitId,
        unitCode: measurementUnits.code,
        unitName: measurementUnits.name,
        quantityMilli: salesCheckpointItems.quantityMilli,
        revenueMinor: salesCheckpointItems.estimatedSalesValueMinor,
        trayCount: salesCheckpointItems.trayCount,
        estimatedWeightGrams: salesCheckpointItems.estimatedWeightGrams,
        measuredWeightGrams: salesCheckpointItems.measuredWeightGrams,
      })
      .from(salesCheckpointItems)
      .innerJoin(
        salesCheckpoints,
        and(
          eq(salesCheckpoints.organizationId, salesCheckpointItems.organizationId),
          eq(salesCheckpoints.id, salesCheckpointItems.checkpointId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.organizationId, salesCheckpointItems.organizationId),
          eq(products.id, salesCheckpointItems.productId),
        ),
      )
      .innerJoin(
        measurementUnits,
        and(
          eq(measurementUnits.organizationId, salesCheckpointItems.organizationId),
          eq(measurementUnits.id, salesCheckpointItems.unitId),
        ),
      )
      .where(and(...salesConditions))
      .orderBy(asc(salesCheckpoints.businessDate), asc(salesCheckpoints.id));

    const purchaseConditions: SQL[] = [
      eq(purchases.organizationId, organizationId),
      eq(purchases.status, 'RECEIVED'),
      gte(purchases.deliveryDate, query.from),
      lte(purchases.deliveryDate, query.to),
    ];
    if (branch !== undefined) {
      purchaseConditions.push(eq(purchases.branchId, branch));
    }

    const purchaseRows = await this.db
      .select({
        purchaseId: purchases.id,
        branchId: purchases.branchId,
        supplierId: purchases.supplierId,
        supplierName: suppliers.name,
        deliveryDate: purchases.deliveryDate,
        totalMinor: purchases.totalMinor,
      })
      .from(purchases)
      .innerJoin(
        suppliers,
        and(
          eq(suppliers.organizationId, purchases.organizationId),
          eq(suppliers.id, purchases.supplierId),
        ),
      )
      .where(and(...purchaseConditions))
      .orderBy(asc(purchases.deliveryDate), asc(purchases.id));

    const costConditions: SQL[] = [
      eq(purchases.organizationId, organizationId),
      eq(purchases.status, 'RECEIVED'),
      lte(purchases.deliveryDate, query.to),
    ];
    if (branch !== undefined) {
      costConditions.push(eq(purchases.branchId, branch));
    }

    const costRows = await this.db
      .select({
        purchaseId: purchases.id,
        branchId: purchases.branchId,
        productId: purchaseItems.productId,
        unitId: purchaseItems.unitId,
        unitPriceMinor: purchaseItems.unitPriceMinor,
        deliveryDate: purchases.deliveryDate,
        receivedAt: purchases.receivedAt,
      })
      .from(purchaseItems)
      .innerJoin(
        purchases,
        and(
          eq(purchases.organizationId, purchaseItems.organizationId),
          eq(purchases.id, purchaseItems.purchaseId),
        ),
      )
      .where(and(...costConditions))
      .orderBy(asc(purchases.deliveryDate), asc(purchases.receivedAt), asc(purchases.id));

    const productionConditions: SQL[] = [
      eq(productionBatches.organizationId, organizationId),
      eq(productionBatches.status, 'CONFIRMED'),
      gte(productionBatches.businessDate, query.from),
      lte(productionBatches.businessDate, query.to),
    ];
    if (branch !== undefined) {
      productionConditions.push(eq(productionBatches.branchId, branch));
    }

    const productionRows = await this.db
      .select({
        batchId: productionBatches.id,
        branchId: productionBatches.branchId,
        businessDate: productionBatches.businessDate,
        productId: productionOutputs.productId,
        productName: products.name,
        productKind: products.kind,
        unitId: products.inventoryUnitId,
        unitCode: measurementUnits.code,
        unitName: measurementUnits.name,
        trayCount: productionOutputs.trayCount,
        estimatedWeightGrams: productionOutputs.estimatedWeightGrams,
        measuredWeightGrams: productionOutputs.measuredWeightGrams,
      })
      .from(productionOutputs)
      .innerJoin(
        productionBatches,
        and(
          eq(productionBatches.organizationId, productionOutputs.organizationId),
          eq(productionBatches.id, productionOutputs.batchId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.organizationId, productionOutputs.organizationId),
          eq(products.id, productionOutputs.productId),
        ),
      )
      .innerJoin(
        measurementUnits,
        and(
          eq(measurementUnits.organizationId, products.organizationId),
          eq(measurementUnits.id, products.inventoryUnitId),
        ),
      )
      .where(and(...productionConditions))
      .orderBy(asc(productionBatches.businessDate), asc(productionBatches.id));

    const inventoryWasteConditions: SQL[] = [
      eq(inventoryWaste.organizationId, organizationId),
      gte(inventoryWaste.occurredAt, start),
      lt(inventoryWaste.occurredAt, end),
    ];
    if (branch !== undefined) {
      inventoryWasteConditions.push(eq(inventoryWaste.branchId, branch));
    }

    const inventoryWasteRows = await this.db
      .select({
        branchId: inventoryWaste.branchId,
        occurredAt: inventoryWaste.occurredAt,
        productId: inventoryWaste.productId,
        productName: products.name,
        productKind: products.kind,
        unitId: products.inventoryUnitId,
        unitCode: measurementUnits.code,
        unitName: measurementUnits.name,
        quantityMilli: inventoryWaste.quantityMilli,
      })
      .from(inventoryWaste)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, inventoryWaste.organizationId),
          eq(products.id, inventoryWaste.productId),
        ),
      )
      .innerJoin(
        measurementUnits,
        and(
          eq(measurementUnits.organizationId, products.organizationId),
          eq(measurementUnits.id, products.inventoryUnitId),
        ),
      )
      .where(and(...inventoryWasteConditions));

    const productionWasteConditions: SQL[] = [
      eq(productionBatches.organizationId, organizationId),
      eq(productionBatches.status, 'CONFIRMED'),
      gte(productionBatches.businessDate, query.from),
      lte(productionBatches.businessDate, query.to),
    ];
    if (branch !== undefined) {
      productionWasteConditions.push(eq(productionBatches.branchId, branch));
    }

    const productionWasteRows = await this.db
      .select({
        branchId: productionBatches.branchId,
        occurredAt: productionWaste.createdAt,
        productId: productionWaste.productId,
        productName: products.name,
        productKind: products.kind,
        unitId: products.inventoryUnitId,
        unitCode: measurementUnits.code,
        unitName: measurementUnits.name,
        quantityMilli: productionWaste.quantityMilli,
      })
      .from(productionWaste)
      .innerJoin(
        productionBatches,
        and(
          eq(productionBatches.organizationId, productionWaste.organizationId),
          eq(productionBatches.id, productionWaste.batchId),
        ),
      )
      .innerJoin(
        products,
        and(
          eq(products.organizationId, productionWaste.organizationId),
          eq(products.id, productionWaste.productId),
        ),
      )
      .innerJoin(
        measurementUnits,
        and(
          eq(measurementUnits.organizationId, products.organizationId),
          eq(measurementUnits.id, products.inventoryUnitId),
        ),
      )
      .where(and(...productionWasteConditions));

    const inventoryConditions: SQL[] = [
      eq(stockMovements.organizationId, organizationId),
      lt(stockMovements.occurredAt, end),
    ];
    if (branch !== undefined) {
      inventoryConditions.push(eq(stockMovements.branchId, branch));
    }

    const inventoryRows = await this.db
      .select({
        branchId: stockMovements.branchId,
        productId: stockMovements.productId,
        productName: products.name,
        productKind: products.kind,
        unitId: products.inventoryUnitId,
        unitCode: measurementUnits.code,
        unitName: measurementUnits.name,
        quantityMilli: sql<number>`coalesce(sum(${stockMovements.quantityDeltaMilli}), 0)::int`,
      })
      .from(stockMovements)
      .innerJoin(
        products,
        and(
          eq(products.organizationId, stockMovements.organizationId),
          eq(products.id, stockMovements.productId),
        ),
      )
      .innerJoin(
        measurementUnits,
        and(
          eq(measurementUnits.organizationId, products.organizationId),
          eq(measurementUnits.id, products.inventoryUnitId),
        ),
      )
      .where(and(...inventoryConditions))
      .groupBy(
        stockMovements.branchId,
        stockMovements.productId,
        products.name,
        products.kind,
        products.inventoryUnitId,
        measurementUnits.code,
        measurementUnits.name,
      )
      .orderBy(asc(stockMovements.branchId), asc(products.name));

    return {
      branches: branchRows.map((row) => ({
        branchId: asBranchId(row.id),
        branchName: row.name,
      })),
      salesLines: salesRows.map((row) => ({
        checkpointId: asSalesCheckpointId(row.checkpointId),
        branchId: asBranchId(row.branchId),
        businessDate: row.businessDate,
        productId: asProductId(row.productId),
        productName: row.productName,
        productKind: row.productKind,
        unitId: asMeasurementUnitId(row.unitId),
        unitCode: row.unitCode,
        unitName: row.unitName,
        quantityMilli: row.quantityMilli,
        revenueMinor: row.revenueMinor,
        trayCount: row.trayCount ?? 0,
        estimatedWeightGrams: row.estimatedWeightGrams ?? 0,
        ...(row.measuredWeightGrams === null
          ? {}
          : { measuredWeightGrams: row.measuredWeightGrams }),
      })),
      purchaseLines: purchaseRows.map((row) => ({
        purchaseId: row.purchaseId,
        branchId: asBranchId(row.branchId),
        supplierId: asSupplierId(row.supplierId),
        supplierName: row.supplierName,
        deliveryDate: row.deliveryDate,
        totalMinor: row.totalMinor,
      })),
      costLines: costRows
        .filter((row) => row.receivedAt !== null)
        .map((row) => ({
          purchaseId: row.purchaseId,
          branchId: asBranchId(row.branchId),
          productId: asProductId(row.productId),
          unitId: asMeasurementUnitId(row.unitId),
          unitPriceMinor: row.unitPriceMinor,
          deliveryDate: row.deliveryDate,
          receivedAt: row.receivedAt!.toISOString(),
        })),
      productionLines: productionRows.map((row) => ({
        batchId: asProductionBatchId(row.batchId),
        branchId: asBranchId(row.branchId),
        businessDate: row.businessDate,
        productId: asProductId(row.productId),
        productName: row.productName,
        productKind: row.productKind,
        unitId: asMeasurementUnitId(row.unitId),
        unitCode: row.unitCode,
        unitName: row.unitName,
        trayCount: row.trayCount,
        estimatedWeightGrams: row.estimatedWeightGrams,
        ...(row.measuredWeightGrams === null
          ? {}
          : { measuredWeightGrams: row.measuredWeightGrams }),
      })),
      wasteLines: [
        ...inventoryWasteRows.map((row) => ({
          branchId: asBranchId(row.branchId),
          occurredAt: row.occurredAt.toISOString(),
          productId: asProductId(row.productId),
          productName: row.productName,
          productKind: row.productKind,
          unitId: asMeasurementUnitId(row.unitId),
          unitCode: row.unitCode,
          unitName: row.unitName,
          quantityMilli: row.quantityMilli,
          source: 'INVENTORY' as const,
        })),
        ...productionWasteRows.map((row) => ({
          branchId: asBranchId(row.branchId),
          occurredAt: row.occurredAt.toISOString(),
          productId: asProductId(row.productId),
          productName: row.productName,
          productKind: row.productKind,
          unitId: asMeasurementUnitId(row.unitId),
          unitCode: row.unitCode,
          unitName: row.unitName,
          quantityMilli: row.quantityMilli,
          source: 'PRODUCTION' as const,
        })),
      ],
      inventoryLines: inventoryRows.map((row) => ({
        branchId: asBranchId(row.branchId),
        productId: asProductId(row.productId),
        productName: row.productName,
        productKind: row.productKind,
        unitId: asMeasurementUnitId(row.unitId),
        unitCode: row.unitCode,
        unitName: row.unitName,
        quantityMilli: Number(row.quantityMilli),
      })),
    };
  }
}
