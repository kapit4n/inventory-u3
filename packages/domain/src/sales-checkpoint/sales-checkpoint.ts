/**
 * Aggregate sales reported for one branch, business date and checkpoint period.
 *
 * A checkpoint never records an individual customer, ticket or payment. Its
 * lines snapshot the weight and price assumptions used at creation so later
 * catalog edits cannot rewrite history. Confirmation writes the stock ledger;
 * a correction is an audited full reversal.
 *
 * The period names and fine-grained reporting fields remain provisional until
 * BR-013 is confirmed. The generic model deliberately keeps those details out
 * of the domain so they can be added without changing the stock semantics.
 */

import type {
  BranchId,
  IsoDate,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductId,
  ProductPresentationId,
  SalesCheckpointId,
  SalesCheckpointItemId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { isValidIsoDate } from '../shared/time.js';
import type { ProductPriceBasis } from '../product/product-price-history.js';
import { isProductKind, type ProductKind } from '../product/product-kind.js';
import { normalizeStockNote } from '../stock/stock-entry.js';

export const SALES_CHECKPOINT_STATUSES = ['DRAFT', 'CONFIRMED', 'CORRECTED'] as const;
export type SalesCheckpointStatus = (typeof SALES_CHECKPOINT_STATUSES)[number];

export const SALES_CHECKPOINT_PERIODS = ['MORNING', 'EVENING'] as const;
export type SalesCheckpointPeriod = (typeof SALES_CHECKPOINT_PERIODS)[number];

export const SALES_CHECKPOINT_WEIGHT_BASES = ['ESTIMATED', 'MEASURED', 'NOT_APPLICABLE'] as const;
export type SalesCheckpointWeightBasis = (typeof SALES_CHECKPOINT_WEIGHT_BASES)[number];

export const SALES_CHECKPOINT_NOTE_MAX_LENGTH = 500;

export function isSalesCheckpointStatus(value: unknown): value is SalesCheckpointStatus {
  return (
    typeof value === 'string' && (SALES_CHECKPOINT_STATUSES as readonly string[]).includes(value)
  );
}

export function isSalesCheckpointPeriod(value: unknown): value is SalesCheckpointPeriod {
  return (
    typeof value === 'string' && (SALES_CHECKPOINT_PERIODS as readonly string[]).includes(value)
  );
}

export function isSalesCheckpointWeightBasis(value: unknown): value is SalesCheckpointWeightBasis {
  return (
    typeof value === 'string' &&
    (SALES_CHECKPOINT_WEIGHT_BASES as readonly string[]).includes(value)
  );
}

export interface SalesCheckpointItem {
  readonly id: SalesCheckpointItemId;
  readonly organizationId: OrganizationId;
  readonly checkpointId: SalesCheckpointId;
  readonly productId: ProductId;
  /** The product's raw/processed kind at the time the checkpoint was created. */
  readonly productKind: ProductKind;
  /** Snapshot of the unit used for the line quantity. */
  readonly unitId: MeasurementUnitId;
  /** Positive quantity in thousandths of the sales unit. */
  readonly quantityMilli: number;
  readonly presentationId?: ProductPresentationId;
  readonly trayCount?: number;
  /** Snapshot of the presentation average weight at checkpoint creation. */
  readonly averageWeightPerTrayGrams?: number;
  /** `trayCount × averageWeightPerTrayGrams`, stored exactly, for processed lines. */
  readonly estimatedWeightGrams?: number;
  readonly measuredWeightGrams?: number;
  readonly weightBasis: SalesCheckpointWeightBasis;
  /** Snapshot of the applicable selling price in minor units. */
  readonly sellingPriceAmountMinor: number;
  readonly sellingPriceBasis: ProductPriceBasis;
  readonly sellingPriceCurrency: string;
  /** `quantityMilli × sellingPriceAmountMinor`, rounded to the nearest minor unit. */
  readonly estimatedSalesValueMinor: number;
  readonly position: number;
  readonly createdAt: IsoDateTime;
}

export interface NewSalesCheckpointItem {
  readonly id: SalesCheckpointItemId;
  readonly productId: ProductId;
  readonly productKind: ProductKind;
  readonly unitId: MeasurementUnitId;
  /** Required for raw lines; derived from the processed weight when omitted. */
  readonly quantityMilli?: number;
  readonly presentationId?: ProductPresentationId;
  readonly trayCount?: number;
  readonly averageWeightPerTrayGrams?: number;
  readonly measuredWeightGrams?: number;
  readonly sellingPriceAmountMinor: number;
  readonly sellingPriceBasis: ProductPriceBasis;
  readonly sellingPriceCurrency: string;
}

export interface SalesCheckpoint {
  readonly id: SalesCheckpointId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly period: SalesCheckpointPeriod;
  readonly status: SalesCheckpointStatus;
  readonly registeredByUserId: UserId;
  readonly note?: string;
  readonly confirmedByUserId?: UserId;
  readonly confirmedAt?: IsoDateTime;
  readonly correctedByUserId?: UserId;
  readonly correctedAt?: IsoDateTime;
  readonly correctionReason?: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly items: readonly SalesCheckpointItem[];
}

export interface NewSalesCheckpoint {
  readonly id: SalesCheckpointId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly businessDate: IsoDate;
  readonly period: SalesCheckpointPeriod;
  readonly registeredByUserId: UserId;
  readonly note?: string;
  readonly items: readonly NewSalesCheckpointItem[];
}

export interface SalesCheckpointConfirmation {
  readonly confirmedByUserId: UserId;
  readonly confirmedAt: IsoDateTime;
}

export interface SalesCheckpointCorrection {
  readonly correctedByUserId: UserId;
  readonly correctedAt: IsoDateTime;
  readonly reason: string;
}

export function createSalesCheckpoint(
  input: NewSalesCheckpoint,
  now: IsoDateTime,
): SalesCheckpoint {
  if (!isValidIsoDate(input.businessDate)) {
    throw new DomainError('INVALID_INPUT', 'Sales checkpoint business date must be a valid date');
  }

  if (!isSalesCheckpointPeriod(input.period)) {
    throw new DomainError('INVALID_INPUT', 'Sales checkpoint period must be MORNING or EVENING');
  }

  if (input.items.length === 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'A sales checkpoint must have at least one product line',
    );
  }

  const seenIds = new Set<string>();
  const items = input.items.map((line, index) => createItem(line, input, index + 1, now, seenIds));
  const note = normalizeCheckpointNote(input.note);

  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    businessDate: input.businessDate,
    period: input.period,
    status: 'DRAFT',
    registeredByUserId: input.registeredByUserId,
    ...(note === undefined ? {} : { note }),
    createdAt: now,
    updatedAt: now,
    items: Object.freeze(items),
  });
}

export function confirmSalesCheckpoint(
  checkpoint: SalesCheckpoint,
  confirmation: SalesCheckpointConfirmation,
): SalesCheckpoint {
  if (checkpoint.status !== 'DRAFT') {
    throw new DomainError('INVALID_STATE', 'Only a draft sales checkpoint can be confirmed', {
      status: checkpoint.status,
    });
  }

  return Object.freeze({
    ...checkpoint,
    status: 'CONFIRMED',
    confirmedByUserId: confirmation.confirmedByUserId,
    confirmedAt: confirmation.confirmedAt,
    updatedAt: confirmation.confirmedAt,
  });
}

export function correctSalesCheckpoint(
  checkpoint: SalesCheckpoint,
  correction: SalesCheckpointCorrection,
): SalesCheckpoint {
  if (checkpoint.status !== 'CONFIRMED') {
    throw new DomainError('INVALID_STATE', 'Only a confirmed sales checkpoint can be corrected', {
      status: checkpoint.status,
    });
  }

  const reason = normalizeCheckpointReason(correction.reason);

  return Object.freeze({
    ...checkpoint,
    status: 'CORRECTED',
    correctedByUserId: correction.correctedByUserId,
    correctedAt: correction.correctedAt,
    correctionReason: reason,
    updatedAt: correction.correctedAt,
  });
}

/** The quantity a confirmed checkpoint removes from branch stock. */
export function salesCheckpointItemQuantityMilli(item: SalesCheckpointItem): number {
  return item.quantityMilli;
}

export function calculateEstimatedSalesValueMinor(
  quantityMilli: number,
  sellingPriceAmountMinor: number,
): number {
  const product = quantityMilli * sellingPriceAmountMinor;

  if (!Number.isSafeInteger(product)) {
    throw new DomainError('INVALID_INPUT', 'Estimated sales value is too large');
  }

  return Math.floor((product + 500) / 1000);
}

function createItem(
  input: NewSalesCheckpointItem,
  checkpoint: NewSalesCheckpoint,
  position: number,
  now: IsoDateTime,
  seenIds: Set<string>,
): SalesCheckpointItem {
  assertUniqueId(seenIds, input.id);

  if (!isProductKind(input.productKind)) {
    throw new DomainError(
      'INVALID_INPUT',
      'Sales checkpoint product kind must be RAW or PROCESSED',
      {
        lineId: input.id,
      },
    );
  }

  assertSellingPrice(input);
  const noteFields = snapshotLineShape(input);
  const quantityMilli = noteFields.quantityMilli;
  assertPositiveInteger(quantityMilli, 'Sales checkpoint quantity', input.id);

  return Object.freeze({
    id: input.id,
    organizationId: checkpoint.organizationId,
    checkpointId: checkpoint.id,
    productId: input.productId,
    productKind: input.productKind,
    unitId: input.unitId,
    quantityMilli,
    ...(noteFields.presentationId === undefined
      ? {}
      : { presentationId: noteFields.presentationId }),
    ...(noteFields.trayCount === undefined ? {} : { trayCount: noteFields.trayCount }),
    ...(noteFields.averageWeightPerTrayGrams === undefined
      ? {}
      : { averageWeightPerTrayGrams: noteFields.averageWeightPerTrayGrams }),
    ...(noteFields.estimatedWeightGrams === undefined
      ? {}
      : { estimatedWeightGrams: noteFields.estimatedWeightGrams }),
    ...(noteFields.measuredWeightGrams === undefined
      ? {}
      : { measuredWeightGrams: noteFields.measuredWeightGrams }),
    weightBasis: noteFields.weightBasis,
    sellingPriceAmountMinor: input.sellingPriceAmountMinor,
    sellingPriceBasis: input.sellingPriceBasis,
    sellingPriceCurrency: input.sellingPriceCurrency,
    estimatedSalesValueMinor: calculateEstimatedSalesValueMinor(
      quantityMilli,
      input.sellingPriceAmountMinor,
    ),
    position,
    createdAt: now,
  });
}

function snapshotLineShape(input: NewSalesCheckpointItem): {
  readonly quantityMilli: number;
  readonly presentationId?: ProductPresentationId;
  readonly trayCount?: number;
  readonly averageWeightPerTrayGrams?: number;
  readonly estimatedWeightGrams?: number;
  readonly measuredWeightGrams?: number;
  readonly weightBasis: SalesCheckpointWeightBasis;
} {
  if (input.productKind === 'RAW') {
    if (
      input.presentationId !== undefined ||
      input.trayCount !== undefined ||
      input.averageWeightPerTrayGrams !== undefined ||
      input.measuredWeightGrams !== undefined
    ) {
      throw new DomainError('INVALID_INPUT', 'A raw sales line must not use tray weight fields', {
        lineId: input.id,
      });
    }

    if (input.quantityMilli === undefined) {
      throw new DomainError('INVALID_INPUT', 'A raw sales line requires a quantity', {
        lineId: input.id,
      });
    }

    if (input.sellingPriceBasis !== 'PER_SALES_UNIT') {
      throw new DomainError(
        'INVALID_INPUT',
        'A raw sales line must snapshot a per-unit selling price',
        { lineId: input.id },
      );
    }

    return { quantityMilli: input.quantityMilli, weightBasis: 'NOT_APPLICABLE' };
  }

  if (
    input.presentationId === undefined ||
    input.trayCount === undefined ||
    input.averageWeightPerTrayGrams === undefined
  ) {
    throw new DomainError(
      'INVALID_INPUT',
      'A processed sales line requires a presentation, tray count and average weight',
      { lineId: input.id },
    );
  }

  assertPositiveInteger(input.trayCount, 'Sales tray count', input.id);
  assertPositiveInteger(input.averageWeightPerTrayGrams, 'Average weight per tray', input.id);

  if (input.measuredWeightGrams !== undefined) {
    assertPositiveInteger(input.measuredWeightGrams, 'Measured sales weight', input.id);
  }

  const estimatedWeightGrams = input.trayCount * input.averageWeightPerTrayGrams;
  if (!Number.isSafeInteger(estimatedWeightGrams)) {
    throw new DomainError('INVALID_INPUT', 'Estimated sales weight is too large', {
      lineId: input.id,
    });
  }

  if (input.sellingPriceBasis !== 'PER_KILOGRAM') {
    throw new DomainError(
      'INVALID_INPUT',
      'A processed sales line must snapshot a per-kilogram selling price',
      { lineId: input.id },
    );
  }

  const quantityMilli = input.measuredWeightGrams ?? estimatedWeightGrams;

  return {
    quantityMilli,
    presentationId: input.presentationId,
    trayCount: input.trayCount,
    averageWeightPerTrayGrams: input.averageWeightPerTrayGrams,
    estimatedWeightGrams,
    ...(input.measuredWeightGrams === undefined
      ? {}
      : { measuredWeightGrams: input.measuredWeightGrams }),
    weightBasis: input.measuredWeightGrams === undefined ? 'ESTIMATED' : 'MEASURED',
  };
}

function assertSellingPrice(input: NewSalesCheckpointItem): void {
  if (!Number.isSafeInteger(input.sellingPriceAmountMinor) || input.sellingPriceAmountMinor < 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'Selling price must be a non-negative whole number in minor units',
      { lineId: input.id },
    );
  }

  if (!/^[A-Z]{3}$/.test(input.sellingPriceCurrency)) {
    throw new DomainError('INVALID_INPUT', 'Selling price currency must be a three-letter code', {
      lineId: input.id,
    });
  }
}

function assertUniqueId(seenIds: Set<string>, id: string): void {
  if (seenIds.has(id)) {
    throw new DomainError('INVALID_INPUT', 'Sales checkpoint line identifiers must be unique', {
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

function normalizeCheckpointNote(note: string | undefined): string | undefined {
  const normalized = normalizeStockNote(note);

  if (normalized !== undefined && normalized.length > SALES_CHECKPOINT_NOTE_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Sales checkpoint note must be between 1 and ${SALES_CHECKPOINT_NOTE_MAX_LENGTH} characters`,
    );
  }

  return normalized;
}

function normalizeCheckpointReason(reason: string): string {
  const normalized = reason.trim();

  if (normalized.length === 0 || normalized.length > SALES_CHECKPOINT_NOTE_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Sales checkpoint correction reason must be between 1 and ${SALES_CHECKPOINT_NOTE_MAX_LENGTH} characters`,
    );
  }

  return normalized;
}
