/**
 * A branch's tray production: who prepared it, who registered it, what was
 * consumed, what was produced and what was lost.
 *
 * Weight assumptions are copied into each output line at creation. Later edits
 * to the presentation's average weight never rewrite history. Confirming a batch
 * writes the stock ledger; correcting it records an audited compensating path.
 */

import type {
  BranchId,
  EmployeeId,
  IsoDate,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductId,
  ProductPresentationId,
  ProductionBatchId,
  ProductionInputId,
  ProductionOutputId,
  ProductionWasteId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { isValidIsoDate } from '../shared/time.js';
import { normalizeStockNote, normalizeStockReason } from '../stock/stock-entry.js';

export const PRODUCTION_STATUSES = ['DRAFT', 'CONFIRMED', 'CORRECTED'] as const;
export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_WEIGHT_BASES = ['ESTIMATED', 'MEASURED'] as const;
export type ProductionWeightBasis = (typeof PRODUCTION_WEIGHT_BASES)[number];

export const PRODUCTION_NOTE_MAX_LENGTH = 500;

export function isProductionStatus(value: unknown): value is ProductionStatus {
  return typeof value === 'string' && (PRODUCTION_STATUSES as readonly string[]).includes(value);
}

export function isProductionWeightBasis(value: unknown): value is ProductionWeightBasis {
  return (
    typeof value === 'string' && (PRODUCTION_WEIGHT_BASES as readonly string[]).includes(value)
  );
}

export interface ProductionInput {
  readonly id: ProductionInputId;
  readonly organizationId: OrganizationId;
  readonly batchId: ProductionBatchId;
  readonly productId: ProductId;
  readonly unitId: MeasurementUnitId;
  /** Positive quantity in thousandths of the product inventory unit. */
  readonly quantityMilli: number;
  readonly position: number;
  readonly createdAt: IsoDateTime;
}

export interface NewProductionInput {
  readonly id: ProductionInputId;
  readonly productId: ProductId;
  readonly unitId: MeasurementUnitId;
  readonly quantityMilli: number;
}

export interface ProductionOutput {
  readonly id: ProductionOutputId;
  readonly organizationId: OrganizationId;
  readonly batchId: ProductionBatchId;
  readonly productId: ProductId;
  readonly presentationId: ProductPresentationId;
  readonly trayCount: number;
  /** Snapshot of the presentation average weight at batch creation. */
  readonly averageWeightPerTrayGrams: number;
  /** `trayCount × averageWeightPerTrayGrams`, stored exactly. */
  readonly estimatedWeightGrams: number;
  /** Measured total weight, when the operator has a reliable scale reading. */
  readonly measuredWeightGrams?: number;
  readonly weightBasis: ProductionWeightBasis;
  readonly position: number;
  readonly createdAt: IsoDateTime;
}

export interface NewProductionOutput {
  readonly id: ProductionOutputId;
  readonly productId: ProductId;
  readonly presentationId: ProductPresentationId;
  readonly trayCount: number;
  readonly averageWeightPerTrayGrams: number;
  readonly measuredWeightGrams?: number;
}

export interface ProductionWaste {
  readonly id: ProductionWasteId;
  readonly organizationId: OrganizationId;
  readonly batchId: ProductionBatchId;
  readonly productId: ProductId;
  /** Positive quantity in thousandths of the product inventory unit. */
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly position: number;
  readonly createdAt: IsoDateTime;
}

export interface NewProductionWaste {
  readonly id: ProductionWasteId;
  readonly productId: ProductId;
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
}

export interface ProductionBatch {
  readonly id: ProductionBatchId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly preparedByEmployeeId: EmployeeId;
  readonly registeredByUserId: UserId;
  readonly status: ProductionStatus;
  readonly note?: string;
  readonly confirmedByUserId?: UserId;
  readonly confirmedAt?: IsoDateTime;
  readonly correctedByUserId?: UserId;
  readonly correctedAt?: IsoDateTime;
  readonly correctionReason?: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly inputs: readonly ProductionInput[];
  readonly outputs: readonly ProductionOutput[];
  readonly waste: readonly ProductionWaste[];
}

export interface NewProductionBatch {
  readonly id: ProductionBatchId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly preparedByEmployeeId: EmployeeId;
  readonly registeredByUserId: UserId;
  readonly note?: string;
  readonly inputs: readonly NewProductionInput[];
  readonly outputs: readonly NewProductionOutput[];
  readonly waste: readonly NewProductionWaste[];
}

export interface ProductionConfirmation {
  readonly confirmedByUserId: UserId;
  readonly confirmedAt: IsoDateTime;
}

export interface ProductionCorrection {
  readonly correctedByUserId: UserId;
  readonly correctedAt: IsoDateTime;
  readonly reason: string;
}

export function createProductionBatch(
  input: NewProductionBatch,
  now: IsoDateTime,
): ProductionBatch {
  if (!isValidIsoDate(input.businessDate)) {
    throw new DomainError('INVALID_INPUT', 'Production business date must be a valid date');
  }

  if (input.inputs.length === 0 && input.outputs.length === 0 && input.waste.length === 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'A production batch must have an input, an output or a waste line',
    );
  }

  const seenIds = new Set<string>();
  const inputs = input.inputs.map((line, index) =>
    createInput(line, input, index + 1, now, seenIds),
  );
  const outputs = input.outputs.map((line, index) =>
    createOutput(line, input, index + 1, now, seenIds),
  );
  const waste = input.waste.map((line, index) => createWaste(line, input, index + 1, now, seenIds));
  const note = normalizeProductionNote(input.note);

  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    businessDate: input.businessDate,
    preparedByEmployeeId: input.preparedByEmployeeId,
    registeredByUserId: input.registeredByUserId,
    status: 'DRAFT',
    ...(note === undefined ? {} : { note }),
    createdAt: now,
    updatedAt: now,
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs),
    waste: Object.freeze(waste),
  });
}

export function confirmProductionBatch(
  batch: ProductionBatch,
  confirmation: ProductionConfirmation,
): ProductionBatch {
  if (batch.status !== 'DRAFT') {
    throw new DomainError('INVALID_STATE', 'Only a draft production batch can be confirmed', {
      status: batch.status,
    });
  }

  return Object.freeze({
    ...batch,
    status: 'CONFIRMED',
    confirmedByUserId: confirmation.confirmedByUserId,
    confirmedAt: confirmation.confirmedAt,
    updatedAt: confirmation.confirmedAt,
  });
}

export function correctProductionBatch(
  batch: ProductionBatch,
  correction: ProductionCorrection,
): ProductionBatch {
  if (batch.status !== 'CONFIRMED') {
    throw new DomainError('INVALID_STATE', 'Only a confirmed production batch can be corrected', {
      status: batch.status,
    });
  }

  const reason = normalizeStockReason(correction.reason);

  return Object.freeze({
    ...batch,
    status: 'CORRECTED',
    correctedByUserId: correction.correctedByUserId,
    correctedAt: correction.correctedAt,
    correctionReason: reason,
    updatedAt: correction.correctedAt,
  });
}

/**
 * The stock quantity an output adds to the branch ledger.
 *
 * Presentation weights and measured weights are integer grams. Production
 * outputs must use kilograms as their inventory unit, where one gram is exactly
 * one thousandth of a kilogram, so the value maps one-to-one to milli-kilograms.
 */
export function productionOutputQuantityMilli(output: ProductionOutput): number {
  return output.measuredWeightGrams ?? output.estimatedWeightGrams;
}

function createInput(
  input: NewProductionInput,
  batch: NewProductionBatch,
  position: number,
  now: IsoDateTime,
  seenIds: Set<string>,
): ProductionInput {
  assertUniqueId(seenIds, input.id);
  assertPositiveInteger(input.quantityMilli, 'Production input quantity', input.id);

  return Object.freeze({
    id: input.id,
    organizationId: batch.organizationId,
    batchId: batch.id,
    productId: input.productId,
    unitId: input.unitId,
    quantityMilli: input.quantityMilli,
    position,
    createdAt: now,
  });
}

function createOutput(
  input: NewProductionOutput,
  batch: NewProductionBatch,
  position: number,
  now: IsoDateTime,
  seenIds: Set<string>,
): ProductionOutput {
  assertUniqueId(seenIds, input.id);
  assertPositiveInteger(input.trayCount, 'Production tray count', input.id);
  assertPositiveInteger(input.averageWeightPerTrayGrams, 'Average weight per tray', input.id);

  if (
    input.measuredWeightGrams !== undefined &&
    (!Number.isSafeInteger(input.measuredWeightGrams) || input.measuredWeightGrams <= 0)
  ) {
    throw new DomainError(
      'INVALID_INPUT',
      'Measured production weight must be a positive whole number of grams',
      { outputId: input.id },
    );
  }

  const estimatedWeightGrams = input.trayCount * input.averageWeightPerTrayGrams;
  if (!Number.isSafeInteger(estimatedWeightGrams)) {
    throw new DomainError('INVALID_INPUT', 'Estimated production weight is too large', {
      outputId: input.id,
    });
  }

  return Object.freeze({
    id: input.id,
    organizationId: batch.organizationId,
    batchId: batch.id,
    productId: input.productId,
    presentationId: input.presentationId,
    trayCount: input.trayCount,
    averageWeightPerTrayGrams: input.averageWeightPerTrayGrams,
    estimatedWeightGrams,
    ...(input.measuredWeightGrams === undefined
      ? {}
      : { measuredWeightGrams: input.measuredWeightGrams }),
    weightBasis: input.measuredWeightGrams === undefined ? 'ESTIMATED' : 'MEASURED',
    position,
    createdAt: now,
  });
}

function createWaste(
  input: NewProductionWaste,
  batch: NewProductionBatch,
  position: number,
  now: IsoDateTime,
  seenIds: Set<string>,
): ProductionWaste {
  assertUniqueId(seenIds, input.id);
  assertPositiveInteger(input.quantityMilli, 'Production waste quantity', input.id);
  const reason = normalizeStockReason(input.reason);
  const note = normalizeStockNote(input.note);

  return Object.freeze({
    id: input.id,
    organizationId: batch.organizationId,
    batchId: batch.id,
    productId: input.productId,
    quantityMilli: input.quantityMilli,
    reason,
    ...(note === undefined ? {} : { note }),
    position,
    createdAt: now,
  });
}

function assertUniqueId(seenIds: Set<string>, id: string): void {
  if (seenIds.has(id)) {
    throw new DomainError('INVALID_INPUT', 'Production line identifiers must be unique', {
      lineId: id,
    });
  }
  seenIds.add(id);
}

function assertPositiveInteger(value: number, field: string, lineId: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainError('INVALID_INPUT', `${field} must be a positive whole number`, { lineId });
  }
}

function normalizeProductionNote(note: string | undefined): string | undefined {
  const normalized = note?.trim();

  if (normalized !== undefined && normalized.length > PRODUCTION_NOTE_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Production note must be between 1 and ${PRODUCTION_NOTE_MAX_LENGTH} characters`,
    );
  }

  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}
