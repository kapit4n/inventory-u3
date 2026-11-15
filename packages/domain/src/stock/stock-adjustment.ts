/**
 * A recorded, auditable change to one branch/product balance that did not come
 * from a purchase, production batch or sales checkpoint.
 *
 * A reconciliation keeps the expected and counted quantities so the count can
 * be explained later. A zero-difference reconciliation stores the count but
 * posts no stock movement.
 */

import type {
  BranchId,
  IsoDateTime,
  OrganizationId,
  ProductId,
  StockAdjustmentId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { assertStockInteger, normalizeStockNote, normalizeStockReason } from './stock-entry.js';

export const STOCK_ADJUSTMENT_KINDS = ['MANUAL', 'RECONCILIATION'] as const;

export type StockAdjustmentKind = (typeof STOCK_ADJUSTMENT_KINDS)[number];

export function isStockAdjustmentKind(value: unknown): value is StockAdjustmentKind {
  return typeof value === 'string' && (STOCK_ADJUSTMENT_KINDS as readonly string[]).includes(value);
}

interface StockAdjustmentBase {
  readonly id: StockAdjustmentId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  /** Signed quantity in thousandths. Reconciliation may store zero. */
  readonly quantityDeltaMilli: number;
  readonly reason: string;
  /** Reconciliation only: the derived balance before the count. */
  readonly expectedQuantityMilli?: number;
  /** Reconciliation only: the quantity physically counted. */
  readonly countedQuantityMilli?: number;
  readonly note?: string;
  readonly occurredAt: IsoDateTime;
}

export interface StockAdjustment extends StockAdjustmentBase {
  readonly kind: StockAdjustmentKind;
  readonly recordedAt: IsoDateTime;
  readonly recordedByUserId: UserId;
}

export interface NewStockAdjustment extends StockAdjustmentBase {
  readonly kind: StockAdjustmentKind;
  readonly recordedByUserId: UserId;
}

export interface NewManualAdjustment {
  readonly id: StockAdjustmentId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityDeltaMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly occurredAt: IsoDateTime;
  readonly recordedByUserId: UserId;
}

export interface NewReconciliation {
  readonly id: StockAdjustmentId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly expectedQuantityMilli: number;
  readonly countedQuantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly occurredAt: IsoDateTime;
  readonly recordedByUserId: UserId;
}

export function createManualAdjustment(
  input: NewManualAdjustment,
  recordedAt: IsoDateTime,
): StockAdjustment {
  assertStockInteger(input.quantityDeltaMilli, 'Adjustment quantity');

  if (input.quantityDeltaMilli === 0) {
    throw new DomainError('INVALID_INPUT', 'A manual adjustment must change the stock quantity');
  }

  return createStockAdjustment(
    {
      ...input,
      kind: 'MANUAL',
      quantityDeltaMilli: input.quantityDeltaMilli,
    },
    recordedAt,
  );
}

export function createReconciliation(
  input: NewReconciliation,
  recordedAt: IsoDateTime,
): StockAdjustment {
  assertStockInteger(input.expectedQuantityMilli, 'Expected quantity');
  assertStockInteger(input.countedQuantityMilli, 'Counted quantity');

  if (input.expectedQuantityMilli < 0 || input.countedQuantityMilli < 0) {
    throw new DomainError('INVALID_INPUT', 'Reconciliation quantities must not be negative');
  }

  return createStockAdjustment(
    {
      ...input,
      kind: 'RECONCILIATION',
      quantityDeltaMilli: input.countedQuantityMilli - input.expectedQuantityMilli,
    },
    recordedAt,
  );
}

export function createStockAdjustment(
  input: NewStockAdjustment,
  recordedAt: IsoDateTime,
): StockAdjustment {
  if (!isStockAdjustmentKind(input.kind)) {
    throw new DomainError('INVALID_INPUT', 'Stock adjustment kind must be a known kind');
  }

  assertStockInteger(input.quantityDeltaMilli, 'Adjustment quantity');

  if (input.quantityDeltaMilli === 0 && input.kind !== 'RECONCILIATION') {
    throw new DomainError('INVALID_INPUT', 'A manual adjustment must change the stock quantity');
  }

  if (input.kind === 'MANUAL') {
    if (input.expectedQuantityMilli !== undefined || input.countedQuantityMilli !== undefined) {
      throw new DomainError(
        'INVALID_INPUT',
        'Only a reconciliation may store expected and counted quantities',
      );
    }
  } else {
    if (input.expectedQuantityMilli === undefined || input.countedQuantityMilli === undefined) {
      throw new DomainError(
        'INVALID_INPUT',
        'A reconciliation must store expected and counted quantities',
      );
    }

    assertStockInteger(input.expectedQuantityMilli, 'Expected quantity');
    assertStockInteger(input.countedQuantityMilli, 'Counted quantity');

    if (input.expectedQuantityMilli < 0 || input.countedQuantityMilli < 0) {
      throw new DomainError('INVALID_INPUT', 'Reconciliation quantities must not be negative');
    }

    if (input.quantityDeltaMilli !== input.countedQuantityMilli - input.expectedQuantityMilli) {
      throw new DomainError(
        'INVALID_INPUT',
        'Reconciliation quantity must equal counted minus expected',
      );
    }
  }

  const reason = normalizeStockReason(input.reason);
  const note = normalizeStockNote(input.note);

  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    productId: input.productId,
    kind: input.kind,
    quantityDeltaMilli: input.quantityDeltaMilli,
    reason,
    ...(input.expectedQuantityMilli === undefined
      ? {}
      : { expectedQuantityMilli: input.expectedQuantityMilli }),
    ...(input.countedQuantityMilli === undefined
      ? {}
      : { countedQuantityMilli: input.countedQuantityMilli }),
    ...(note === undefined ? {} : { note }),
    occurredAt: input.occurredAt,
    recordedAt,
    recordedByUserId: input.recordedByUserId,
  });
}
