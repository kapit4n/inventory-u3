import { and, eq } from 'drizzle-orm';

import { inventoryWaste } from '@inventory-u3/database/schema/sqlite';
import type { InventoryWaste, InventoryWasteRepository } from '@inventory-u3/domain';
import {
  asBranchId,
  asInventoryWasteId,
  asOrganizationId,
  asProductId,
  asUserId,
  type BranchId,
  type InventoryWasteId,
  type OrganizationId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type InventoryWasteRow = typeof inventoryWaste.$inferSelect;

export class SQLiteInventoryWasteRepository implements InventoryWasteRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(
    organizationId: OrganizationId,
    inventoryWasteId: InventoryWasteId,
  ): Promise<InventoryWaste | undefined> {
    const [row] = await this.db
      .select()
      .from(inventoryWaste)
      .where(
        and(
          eq(inventoryWaste.organizationId, organizationId),
          eq(inventoryWaste.id, inventoryWasteId),
        ),
      )
      .limit(1);

    return row ? toInventoryWaste(row) : undefined;
  }

  async listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly InventoryWaste[]> {
    const rows = await this.db
      .select()
      .from(inventoryWaste)
      .where(
        and(
          eq(inventoryWaste.organizationId, organizationId),
          eq(inventoryWaste.branchId, branchId),
        ),
      )
      .orderBy(inventoryWaste.occurredAt, inventoryWaste.recordedAt, inventoryWaste.id);

    return rows.map(toInventoryWaste);
  }

  async create(inventoryWasteEntry: InventoryWaste): Promise<InventoryWaste> {
    const [row] = await this.db
      .insert(inventoryWaste)
      .values({
        id: inventoryWasteEntry.id,
        organizationId: inventoryWasteEntry.organizationId,
        branchId: inventoryWasteEntry.branchId,
        productId: inventoryWasteEntry.productId,
        quantityMilli: inventoryWasteEntry.quantityMilli,
        reason: inventoryWasteEntry.reason,
        note: inventoryWasteEntry.note ?? null,
        occurredAt: new Date(inventoryWasteEntry.occurredAt),
        recordedAt: new Date(inventoryWasteEntry.recordedAt),
        recordedByUserId: inventoryWasteEntry.recordedByUserId,
      })
      .returning();

    if (!row) {
      throw new Error('Inventory waste insert did not return a row');
    }

    return toInventoryWaste(row);
  }
}

function toInventoryWaste(row: InventoryWasteRow): InventoryWaste {
  return {
    id: asInventoryWasteId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    productId: asProductId(row.productId),
    quantityMilli: row.quantityMilli,
    reason: row.reason,
    ...(row.note === null ? {} : { note: row.note }),
    occurredAt: row.occurredAt.toISOString(),
    recordedAt: row.recordedAt.toISOString(),
    recordedByUserId: asUserId(row.recordedByUserId),
  };
}
