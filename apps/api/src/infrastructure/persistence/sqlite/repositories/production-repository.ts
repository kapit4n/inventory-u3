import { and, desc, eq, inArray } from 'drizzle-orm';

import {
  productionBatches,
  productionInputs,
  productionOutputs,
  productionWaste,
} from '@inventory-u3/database/schema/sqlite';
import type {
  ProductionBatch,
  ProductionBatchRepository,
  ProductionConfirmation,
  ProductionCorrection,
  ProductionInput,
  ProductionOutput,
  ProductionWaste,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asEmployeeId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductId,
  asProductPresentationId,
  asProductionBatchId,
  asProductionInputId,
  asProductionOutputId,
  asProductionWasteId,
  asUserId,
  type BranchId,
  type IsoDate,
  type IsoDateTime,
  type OrganizationId,
  type ProductionBatchId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type BatchRow = typeof productionBatches.$inferSelect;
type InputRow = typeof productionInputs.$inferSelect;
type OutputRow = typeof productionOutputs.$inferSelect;
type WasteRow = typeof productionWaste.$inferSelect;

export class SQLiteProductionBatchRepository implements ProductionBatchRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
  ): Promise<ProductionBatch | undefined> {
    const [row] = await this.db
      .select()
      .from(productionBatches)
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.id, productionBatchId),
        ),
      )
      .limit(1);

    if (!row) {
      return undefined;
    }

    return toProductionBatch(row, await this.linesFor(organizationId, [productionBatchId]));
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly ProductionBatch[]> {
    const rows = await this.db
      .select()
      .from(productionBatches)
      .where(eq(productionBatches.organizationId, organizationId))
      .orderBy(desc(productionBatches.businessDate), desc(productionBatches.createdAt));

    return this.withLines(organizationId, rows);
  }

  async listByBranch(
    organizationId: OrganizationId,
    branchId: BranchId,
  ): Promise<readonly ProductionBatch[]> {
    const rows = await this.db
      .select()
      .from(productionBatches)
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.branchId, branchId),
        ),
      )
      .orderBy(desc(productionBatches.businessDate), desc(productionBatches.createdAt));

    return this.withLines(organizationId, rows);
  }

  async create(productionBatch: ProductionBatch): Promise<ProductionBatch> {
    const [batchRow] = await this.db
      .insert(productionBatches)
      .values(toBatchInsert(productionBatch))
      .returning();

    if (!batchRow) {
      throw new Error('Production batch insert did not return a row');
    }

    if (productionBatch.inputs.length > 0) {
      await this.db.insert(productionInputs).values(
        productionBatch.inputs.map((line) => ({
          id: line.id,
          organizationId: line.organizationId,
          batchId: line.batchId,
          productId: line.productId,
          unitId: line.unitId,
          quantityMilli: line.quantityMilli,
          position: line.position,
          createdAt: new Date(line.createdAt),
        })),
      );
    }

    if (productionBatch.outputs.length > 0) {
      await this.db.insert(productionOutputs).values(
        productionBatch.outputs.map((line) => ({
          id: line.id,
          organizationId: line.organizationId,
          batchId: line.batchId,
          productId: line.productId,
          presentationId: line.presentationId,
          trayCount: line.trayCount,
          averageWeightPerTrayGrams: line.averageWeightPerTrayGrams,
          estimatedWeightGrams: line.estimatedWeightGrams,
          measuredWeightGrams: line.measuredWeightGrams ?? null,
          weightBasis: line.weightBasis,
          position: line.position,
          createdAt: new Date(line.createdAt),
        })),
      );
    }

    if (productionBatch.waste.length > 0) {
      await this.db.insert(productionWaste).values(
        productionBatch.waste.map((line) => ({
          id: line.id,
          organizationId: line.organizationId,
          batchId: line.batchId,
          productId: line.productId,
          quantityMilli: line.quantityMilli,
          reason: line.reason,
          note: line.note ?? null,
          position: line.position,
          createdAt: new Date(line.createdAt),
        })),
      );
    }

    const saved = await this.findById(productionBatch.organizationId, productionBatch.id);
    if (!saved) {
      throw new Error('Production batch could not be read after insert');
    }
    return saved;
  }

  async markConfirmed(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
    confirmation: ProductionConfirmation,
  ): Promise<ProductionBatch | undefined> {
    const [row] = await this.db
      .update(productionBatches)
      .set({
        status: 'CONFIRMED',
        confirmedByUserId: confirmation.confirmedByUserId,
        confirmedAt: new Date(confirmation.confirmedAt),
        updatedAt: new Date(confirmation.confirmedAt),
      })
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.id, productionBatchId),
          eq(productionBatches.status, 'DRAFT'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, productionBatchId) : undefined;
  }

  async markCorrected(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
    correction: ProductionCorrection,
  ): Promise<ProductionBatch | undefined> {
    const [row] = await this.db
      .update(productionBatches)
      .set({
        status: 'CORRECTED',
        correctedByUserId: correction.correctedByUserId,
        correctedAt: new Date(correction.correctedAt),
        correctionReason: correction.reason,
        updatedAt: new Date(correction.correctedAt),
      })
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.id, productionBatchId),
          eq(productionBatches.status, 'CONFIRMED'),
        ),
      )
      .returning();

    return row ? this.findById(organizationId, productionBatchId) : undefined;
  }

  async deleteDraft(
    organizationId: OrganizationId,
    productionBatchId: ProductionBatchId,
  ): Promise<boolean> {
    const rows = await this.db
      .delete(productionBatches)
      .where(
        and(
          eq(productionBatches.organizationId, organizationId),
          eq(productionBatches.id, productionBatchId),
          eq(productionBatches.status, 'DRAFT'),
        ),
      )
      .returning({ id: productionBatches.id });

    return rows.length > 0;
  }

  private async withLines(
    organizationId: OrganizationId,
    rows: readonly BatchRow[],
  ): Promise<readonly ProductionBatch[]> {
    if (rows.length === 0) {
      return [];
    }

    const lines = await this.linesFor(
      organizationId,
      rows.map((row) => asProductionBatchId(row.id)),
    );
    const [inputs, outputs, waste] = lines;
    const inputsByBatch = groupByBatch(inputs);
    const outputsByBatch = groupByBatch(outputs);
    const wasteByBatch = groupByBatch(waste);

    return rows.map((row) =>
      toProductionBatch(row, [
        inputsByBatch.get(row.id) ?? [],
        outputsByBatch.get(row.id) ?? [],
        wasteByBatch.get(row.id) ?? [],
      ]),
    );
  }

  private async linesFor(
    organizationId: OrganizationId,
    batchIds: readonly ProductionBatchId[],
  ): Promise<
    [readonly ProductionInput[], readonly ProductionOutput[], readonly ProductionWaste[]]
  > {
    if (batchIds.length === 0) {
      return [[], [], []];
    }

    const [inputs, outputs, waste] = await Promise.all([
      this.db
        .select()
        .from(productionInputs)
        .where(
          and(
            eq(productionInputs.organizationId, organizationId),
            inArray(productionInputs.batchId, batchIds),
          ),
        )
        .orderBy(productionInputs.position, productionInputs.id),
      this.db
        .select()
        .from(productionOutputs)
        .where(
          and(
            eq(productionOutputs.organizationId, organizationId),
            inArray(productionOutputs.batchId, batchIds),
          ),
        )
        .orderBy(productionOutputs.position, productionOutputs.id),
      this.db
        .select()
        .from(productionWaste)
        .where(
          and(
            eq(productionWaste.organizationId, organizationId),
            inArray(productionWaste.batchId, batchIds),
          ),
        )
        .orderBy(productionWaste.position, productionWaste.id),
    ]);

    return [
      inputs.map(toProductionInput),
      outputs.map(toProductionOutput),
      waste.map(toProductionWaste),
    ];
  }
}

function groupByBatch<T extends { readonly batchId: string }>(
  lines: readonly T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const line of lines) {
    const list = grouped.get(line.batchId) ?? [];
    list.push(line);
    grouped.set(line.batchId, list);
  }
  return grouped;
}

function toBatchInsert(batch: ProductionBatch): typeof productionBatches.$inferInsert {
  return {
    id: batch.id,
    organizationId: batch.organizationId,
    branchId: batch.branchId,
    businessDate: batch.businessDate,
    preparedByEmployeeId: batch.preparedByEmployeeId,
    registeredByUserId: batch.registeredByUserId,
    status: batch.status,
    note: batch.note ?? null,
    confirmedByUserId: batch.confirmedByUserId ?? null,
    confirmedAt: toDate(batch.confirmedAt),
    correctedByUserId: batch.correctedByUserId ?? null,
    correctedAt: toDate(batch.correctedAt),
    correctionReason: batch.correctionReason ?? null,
    createdAt: new Date(batch.createdAt),
    updatedAt: new Date(batch.updatedAt),
  };
}

function toProductionBatch(
  row: BatchRow,
  [inputs, outputs, waste]: readonly [
    readonly ProductionInput[],
    readonly ProductionOutput[],
    readonly ProductionWaste[],
  ],
): ProductionBatch {
  return {
    id: asProductionBatchId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    businessDate: row.businessDate as IsoDate,
    preparedByEmployeeId: asEmployeeId(row.preparedByEmployeeId),
    registeredByUserId: asUserId(row.registeredByUserId),
    status: row.status,
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
    inputs,
    outputs,
    waste,
  };
}

function toProductionInput(row: InputRow): ProductionInput {
  return {
    id: asProductionInputId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    batchId: asProductionBatchId(row.batchId),
    productId: asProductId(row.productId),
    unitId: asMeasurementUnitId(row.unitId),
    quantityMilli: row.quantityMilli,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProductionOutput(row: OutputRow): ProductionOutput {
  return {
    id: asProductionOutputId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    batchId: asProductionBatchId(row.batchId),
    productId: asProductId(row.productId),
    presentationId: asProductPresentationId(row.presentationId),
    trayCount: row.trayCount,
    averageWeightPerTrayGrams: row.averageWeightPerTrayGrams,
    estimatedWeightGrams: row.estimatedWeightGrams,
    ...(row.measuredWeightGrams === null ? {} : { measuredWeightGrams: row.measuredWeightGrams }),
    weightBasis: row.weightBasis,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProductionWaste(row: WasteRow): ProductionWaste {
  return {
    id: asProductionWasteId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    batchId: asProductionBatchId(row.batchId),
    productId: asProductId(row.productId),
    quantityMilli: row.quantityMilli,
    reason: row.reason,
    ...(row.note === null ? {} : { note: row.note }),
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDate(value: IsoDateTime | undefined): Date | null {
  return value === undefined ? null : new Date(value);
}
