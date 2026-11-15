import { and, eq, sql } from 'drizzle-orm';

import { stockMovements } from '@inventory-u3/database/schema';
import type {
  StockBalance,
  StockMovement,
  StockMovementRepository,
  StockMovementSource,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asOrganizationId,
  asProductId,
  asStockMovementId,
  asUserId,
  type BranchId,
  type OrganizationId,
  type ProductId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type StockMovementRow = typeof stockMovements.$inferSelect;

export class DrizzleStockMovementRepository implements StockMovementRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async create(stockMovement: StockMovement): Promise<StockMovement> {
    const [row] = await this.db
      .insert(stockMovements)
      .values({
        id: stockMovement.id,
        organizationId: stockMovement.organizationId,
        branchId: stockMovement.branchId,
        productId: stockMovement.productId,
        quantityDeltaMilli: stockMovement.quantityDeltaMilli,
        reason: stockMovement.reason,
        sourceType: stockMovement.source?.type ?? null,
        sourceId: stockMovement.source?.id ?? null,
        correctsMovementId: stockMovement.correctsMovementId ?? null,
        occurredAt: new Date(stockMovement.occurredAt),
        recordedAt: new Date(stockMovement.recordedAt),
        recordedByUserId: stockMovement.recordedByUserId,
        note: stockMovement.note ?? null,
      })
      .returning();

    if (!row) {
      throw new Error('Stock movement insert did not return a row');
    }

    return toStockMovement(row);
  }

  async listBySource(
    organizationId: OrganizationId,
    source: StockMovementSource,
  ): Promise<readonly StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          eq(stockMovements.sourceType, source.type),
          eq(stockMovements.sourceId, source.id),
        ),
      )
      .orderBy(stockMovements.occurredAt, stockMovements.recordedAt, stockMovements.id);

    return rows.map(toStockMovement);
  }

  async listByBranchAndProduct(
    organizationId: OrganizationId,
    branchId: BranchId,
    productId: ProductId,
  ): Promise<readonly StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          eq(stockMovements.branchId, branchId),
          eq(stockMovements.productId, productId),
        ),
      )
      .orderBy(
        sql`${stockMovements.occurredAt} desc`,
        sql`${stockMovements.recordedAt} desc`,
        sql`${stockMovements.id} desc`,
      );

    return rows.map(toStockMovement);
  }

  async getBalanceMilli(
    organizationId: OrganizationId,
    branchId: BranchId,
    productId: ProductId,
  ): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${stockMovements.quantityDeltaMilli}), 0)`.mapWith(Number),
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          eq(stockMovements.branchId, branchId),
          eq(stockMovements.productId, productId),
        ),
      );

    return row?.total ?? 0;
  }

  async listBalancesByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly StockBalance[]> {
    const rows = await this.db
      .select({
        branchId: stockMovements.branchId,
        productId: stockMovements.productId,
        quantityOnHandMilli:
          sql<number>`coalesce(sum(${stockMovements.quantityDeltaMilli}), 0)`.mapWith(Number),
        updatedAt: sql<Date>`max(${stockMovements.recordedAt})`,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.organizationId, organizationId),
          eq(stockMovements.branchId, branchId),
        ),
      )
      .groupBy(stockMovements.branchId, stockMovements.productId)
      .orderBy(stockMovements.productId);

    return rows.map((row) => ({
      organizationId,
      branchId: asBranchId(row.branchId),
      productId: asProductId(row.productId),
      quantityOnHandMilli: row.quantityOnHandMilli,
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }
}

function toStockMovement(row: StockMovementRow): StockMovement {
  return {
    id: asStockMovementId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    productId: asProductId(row.productId),
    quantityDeltaMilli: row.quantityDeltaMilli,
    reason: row.reason,
    ...(row.sourceType === null || row.sourceId === null
      ? {}
      : { source: { type: row.sourceType, id: row.sourceId } }),
    ...(row.correctsMovementId === null
      ? {}
      : { correctsMovementId: asStockMovementId(row.correctsMovementId) }),
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    recordedByUserId: asUserId(row.recordedByUserId),
    ...(row.note === null ? {} : { note: row.note }),
  };
}
