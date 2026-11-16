import { and, desc, eq, inArray } from 'drizzle-orm';

import { salesCheckpointItems, salesCheckpoints } from '@inventory-u3/database/schema';
import type {
  SalesCheckpoint,
  SalesCheckpointConfirmation,
  SalesCheckpointCorrection,
  SalesCheckpointItem,
  SalesCheckpointRepository,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asProductPresentationId,
  asSalesCheckpointId,
  asSalesCheckpointItemId,
  asUserId,
  type BranchId,
  type IsoDate,
  type IsoDateTime,
  type OrganizationId,
  type SalesCheckpointId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type CheckpointRow = typeof salesCheckpoints.$inferSelect;
type ItemRow = typeof salesCheckpointItems.$inferSelect;

export class DrizzleSalesCheckpointRepository implements SalesCheckpointRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
  ): Promise<SalesCheckpoint | undefined> {
    const [row] = await this.db
      .select()
      .from(salesCheckpoints)
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.id, salesCheckpointId),
        ),
      )
      .limit(1);

    if (!row) {
      return undefined;
    }

    return toSalesCheckpoint(row, await this.itemsFor(organizationId, [salesCheckpointId]));
  }

  async findByPeriod(
    organizationId: OrganizationId,
    branchId: BranchId,
    businessDate: IsoDate,
    period: SalesCheckpoint['period'],
  ): Promise<SalesCheckpoint | undefined> {
    const [row] = await this.db
      .select()
      .from(salesCheckpoints)
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.branchId, branchId),
          eq(salesCheckpoints.businessDate, businessDate),
          eq(salesCheckpoints.period, period),
        ),
      )
      .limit(1);

    return row
      ? toSalesCheckpoint(row, await this.itemsFor(organizationId, [asSalesCheckpointId(row.id)]))
      : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly SalesCheckpoint[]> {
    const rows = await this.db
      .select()
      .from(salesCheckpoints)
      .where(eq(salesCheckpoints.organizationId, organizationId))
      .orderBy(desc(salesCheckpoints.businessDate), desc(salesCheckpoints.createdAt));

    return this.withItems(organizationId, rows);
  }

  async listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly SalesCheckpoint[]> {
    const rows = await this.db
      .select()
      .from(salesCheckpoints)
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.branchId, branchId),
        ),
      )
      .orderBy(desc(salesCheckpoints.businessDate), desc(salesCheckpoints.createdAt));

    return this.withItems(organizationId, rows);
  }

  async create(salesCheckpoint: SalesCheckpoint): Promise<SalesCheckpoint> {
    const [checkpointRow] = await this.db
      .insert(salesCheckpoints)
      .values(toCheckpointInsert(salesCheckpoint))
      .returning();

    if (!checkpointRow) {
      throw new Error('Sales checkpoint insert did not return a row');
    }

    if (salesCheckpoint.items.length > 0) {
      await this.db.insert(salesCheckpointItems).values(salesCheckpoint.items.map(toItemInsert));
    }

    const saved = await this.findById(salesCheckpoint.organizationId, salesCheckpoint.id);
    if (!saved) {
      throw new Error('Sales checkpoint could not be read after insert');
    }
    return saved;
  }

  async markConfirmed(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
    confirmation: SalesCheckpointConfirmation,
  ): Promise<SalesCheckpoint | undefined> {
    const [row] = await this.db
      .update(salesCheckpoints)
      .set({
        status: 'CONFIRMED',
        confirmedByUserId: confirmation.confirmedByUserId,
        confirmedAt: new Date(confirmation.confirmedAt),
        updatedAt: new Date(confirmation.confirmedAt),
      })
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.id, salesCheckpointId),
          eq(salesCheckpoints.status, 'DRAFT'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, salesCheckpointId) : undefined;
  }

  async markCorrected(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
    correction: SalesCheckpointCorrection,
  ): Promise<SalesCheckpoint | undefined> {
    const [row] = await this.db
      .update(salesCheckpoints)
      .set({
        status: 'CORRECTED',
        correctedByUserId: correction.correctedByUserId,
        correctedAt: new Date(correction.correctedAt),
        correctionReason: correction.reason,
        updatedAt: new Date(correction.correctedAt),
      })
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.id, salesCheckpointId),
          eq(salesCheckpoints.status, 'CONFIRMED'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, salesCheckpointId) : undefined;
  }

  async deleteDraft(
    organizationId: OrganizationId,
    salesCheckpointId: SalesCheckpointId,
  ): Promise<boolean> {
    const rows = await this.db
      .delete(salesCheckpoints)
      .where(
        and(
          eq(salesCheckpoints.organizationId, organizationId),
          eq(salesCheckpoints.id, salesCheckpointId),
          eq(salesCheckpoints.status, 'DRAFT'),
        ),
      )
      .returning({ id: salesCheckpoints.id });

    return rows.length > 0;
  }

  private async withItems(
    organizationId: OrganizationId,
    rows: readonly CheckpointRow[],
  ): Promise<readonly SalesCheckpoint[]> {
    if (rows.length === 0) {
      return [];
    }

    const items = await this.itemsFor(
      organizationId,
      rows.map((row) => asSalesCheckpointId(row.id)),
    );
    return rows.map((row) => toSalesCheckpoint(row, items));
  }

  private async itemsFor(
    organizationId: OrganizationId,
    checkpointIds: readonly SalesCheckpointId[],
  ): Promise<readonly SalesCheckpointItem[]> {
    if (checkpointIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(salesCheckpointItems)
      .where(
        and(
          eq(salesCheckpointItems.organizationId, organizationId),
          inArray(salesCheckpointItems.checkpointId, checkpointIds),
        ),
      )
      .orderBy(salesCheckpointItems.position, salesCheckpointItems.id);

    return rows.map(toSalesCheckpointItem);
  }
}

function toCheckpointInsert(checkpoint: SalesCheckpoint): typeof salesCheckpoints.$inferInsert {
  return {
    id: checkpoint.id,
    organizationId: checkpoint.organizationId,
    branchId: checkpoint.branchId,
    businessDate: checkpoint.businessDate,
    period: checkpoint.period,
    status: checkpoint.status,
    registeredByUserId: checkpoint.registeredByUserId,
    note: checkpoint.note ?? null,
    confirmedByUserId: checkpoint.confirmedByUserId ?? null,
    confirmedAt: toDate(checkpoint.confirmedAt),
    correctedByUserId: checkpoint.correctedByUserId ?? null,
    correctedAt: toDate(checkpoint.correctedAt),
    correctionReason: checkpoint.correctionReason ?? null,
    createdAt: new Date(checkpoint.createdAt),
    updatedAt: new Date(checkpoint.updatedAt),
  };
}

function toItemInsert(item: SalesCheckpointItem): typeof salesCheckpointItems.$inferInsert {
  return {
    id: item.id,
    organizationId: item.organizationId,
    checkpointId: item.checkpointId,
    productId: item.productId,
    productKind: item.productKind,
    unitId: item.unitId,
    quantityMilli: item.quantityMilli,
    presentationId: item.presentationId ?? null,
    trayCount: item.trayCount ?? null,
    averageWeightPerTrayGrams: item.averageWeightPerTrayGrams ?? null,
    estimatedWeightGrams: item.estimatedWeightGrams ?? null,
    measuredWeightGrams: item.measuredWeightGrams ?? null,
    weightBasis: item.weightBasis,
    sellingPriceAmountMinor: item.sellingPriceAmountMinor,
    sellingPriceBasis: item.sellingPriceBasis,
    sellingPriceCurrency: item.sellingPriceCurrency,
    estimatedSalesValueMinor: item.estimatedSalesValueMinor,
    position: item.position,
    createdAt: new Date(item.createdAt),
  };
}

function toSalesCheckpoint(
  row: CheckpointRow,
  items: readonly SalesCheckpointItem[],
): SalesCheckpoint {
  return {
    id: asSalesCheckpointId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    businessDate: row.businessDate as IsoDate,
    period: row.period,
    status: row.status,
    registeredByUserId: asUserId(row.registeredByUserId),
    ...(row.note === null ? {} : { note: row.note }),
    ...(row.confirmedByUserId === null
      ? {}
      : { confirmedByUserId: asUserId(row.confirmedByUserId) }),
    ...(row.confirmedAt === null ? {} : { confirmedAt: row.confirmedAt.toISOString() }),
    ...(row.correctedByUserId === null
      ? {}
      : { correctedByUserId: asUserId(row.correctedByUserId) }),
    ...(row.correctedAt === null ? {} : { correctedAt: row.correctedAt.toISOString() }),
    ...(row.correctionReason === null ? {} : { correctionReason: row.correctionReason }),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: items.filter((item) => item.checkpointId === row.id),
  };
}

function toSalesCheckpointItem(row: ItemRow): SalesCheckpointItem {
  return {
    id: asSalesCheckpointItemId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    checkpointId: asSalesCheckpointId(row.checkpointId),
    productId: asProductId(row.productId),
    productKind: row.productKind,
    unitId: asMeasurementUnitId(row.unitId),
    quantityMilli: row.quantityMilli,
    ...(row.presentationId === null
      ? {}
      : { presentationId: asProductPresentationId(row.presentationId) }),
    ...(row.trayCount === null ? {} : { trayCount: row.trayCount }),
    ...(row.averageWeightPerTrayGrams === null
      ? {}
      : { averageWeightPerTrayGrams: row.averageWeightPerTrayGrams }),
    ...(row.estimatedWeightGrams === null
      ? {}
      : { estimatedWeightGrams: row.estimatedWeightGrams }),
    ...(row.measuredWeightGrams === null ? {} : { measuredWeightGrams: row.measuredWeightGrams }),
    weightBasis: row.weightBasis,
    sellingPriceAmountMinor: row.sellingPriceAmountMinor,
    sellingPriceBasis: row.sellingPriceBasis,
    sellingPriceCurrency: row.sellingPriceCurrency,
    estimatedSalesValueMinor: row.estimatedSalesValueMinor,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDate(value: IsoDateTime | undefined): Date | null {
  return value === undefined ? null : new Date(value);
}
