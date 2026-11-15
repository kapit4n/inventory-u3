import { and, eq } from 'drizzle-orm';

import { stockAdjustments } from '@inventory-u3/database/schema';
import type { StockAdjustment, StockAdjustmentRepository } from '@inventory-u3/domain';
import {
  asBranchId,
  asOrganizationId,
  asProductId,
  asStockAdjustmentId,
  asUserId,
  type BranchId,
  type OrganizationId,
  type StockAdjustmentId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type StockAdjustmentRow = typeof stockAdjustments.$inferSelect;

export class DrizzleStockAdjustmentRepository implements StockAdjustmentRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    stockAdjustmentId: StockAdjustmentId,
  ): Promise<StockAdjustment | undefined> {
    const [row] = await this.db
      .select()
      .from(stockAdjustments)
      .where(
        and(
          eq(stockAdjustments.organizationId, organizationId),
          eq(stockAdjustments.id, stockAdjustmentId),
        ),
      )
      .limit(1);

    return row ? toStockAdjustment(row) : undefined;
  }

  async listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly StockAdjustment[]> {
    const rows = await this.db
      .select()
      .from(stockAdjustments)
      .where(
        and(
          eq(stockAdjustments.organizationId, organizationId),
          eq(stockAdjustments.branchId, branchId),
        ),
      )
      .orderBy(stockAdjustments.occurredAt, stockAdjustments.recordedAt, stockAdjustments.id);

    return rows.map(toStockAdjustment);
  }

  async create(stockAdjustment: StockAdjustment): Promise<StockAdjustment> {
    const [row] = await this.db
      .insert(stockAdjustments)
      .values({
        id: stockAdjustment.id,
        organizationId: stockAdjustment.organizationId,
        branchId: stockAdjustment.branchId,
        productId: stockAdjustment.productId,
        kind: stockAdjustment.kind,
        quantityDeltaMilli: stockAdjustment.quantityDeltaMilli,
        reason: stockAdjustment.reason,
        expectedQuantityMilli: stockAdjustment.expectedQuantityMilli ?? null,
        countedQuantityMilli: stockAdjustment.countedQuantityMilli ?? null,
        note: stockAdjustment.note ?? null,
        occurredAt: new Date(stockAdjustment.occurredAt),
        recordedAt: new Date(stockAdjustment.recordedAt),
        recordedByUserId: stockAdjustment.recordedByUserId,
      })
      .returning();

    if (!row) {
      throw new Error('Stock adjustment insert did not return a row');
    }

    return toStockAdjustment(row);
  }
}

function toStockAdjustment(row: StockAdjustmentRow): StockAdjustment {
  return {
    id: asStockAdjustmentId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    productId: asProductId(row.productId),
    kind: row.kind,
    quantityDeltaMilli: row.quantityDeltaMilli,
    reason: row.reason,
    ...(row.expectedQuantityMilli === null
      ? {}
      : { expectedQuantityMilli: row.expectedQuantityMilli }),
    ...(row.countedQuantityMilli === null
      ? {}
      : { countedQuantityMilli: row.countedQuantityMilli }),
    ...(row.note === null ? {} : { note: row.note }),
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    recordedByUserId: asUserId(row.recordedByUserId),
  };
}
