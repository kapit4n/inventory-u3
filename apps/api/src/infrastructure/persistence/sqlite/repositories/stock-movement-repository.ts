import { and, eq } from 'drizzle-orm';

import { stockMovements } from '@inventory-u3/database/schema/sqlite';
import type {
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
  type OrganizationId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type StockMovementRow = typeof stockMovements.$inferSelect;

export class SQLiteStockMovementRepository implements StockMovementRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async create(stockMovement: StockMovement): Promise<StockMovement> {
    const [row] = await this.db
      .insert(stockMovements)
      .values({
        id: stockMovement.id,
        organizationId: stockMovement.organizationId,
        branchId: stockMovement.branchId,
        productId: stockMovement.productId,
        quantityDelta: stockMovement.quantityDelta,
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
}

function toStockMovement(row: StockMovementRow): StockMovement {
  return {
    id: asStockMovementId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    productId: asProductId(row.productId),
    quantityDelta: row.quantityDelta,
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
