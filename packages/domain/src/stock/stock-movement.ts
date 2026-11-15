/**
 * An append-only change to the stock of one product in one branch.
 *
 * The movement is the source of truth: it is never edited or deleted. A mistake
 * is answered with another movement whose reason is `CORRECTION` and whose
 * `correctsMovementId` points at the original. Reversal arithmetic needs both
 * rows and belongs to the service that reads them, not to this value object.
 *
 * The quantity is a signed integer in thousandths of the product's inventory
 * unit. No unit conversion is applied (BQ-10); the decision to refuse negative
 * balances lives in the use case that knows the current balance (ADR 0041).
 */

import type {
  BranchId,
  IsoDateTime,
  OrganizationId,
  ProductId,
  StockMovementId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { isStockMovementReason, type StockMovementReason } from './stock-movement-reason.js';
import { isStockMovementSourceType, type StockMovementSource } from './stock-movement-source.js';

export interface StockMovement {
  readonly id: StockMovementId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  /** Signed quantity in thousandths of the product's inventory unit; never zero. */
  readonly quantityDeltaMilli: number;
  readonly reason: StockMovementReason;
  /** The record that caused this movement, when one exists. */
  readonly source?: StockMovementSource;
  /** Set only on a correction; points at the movement being corrected. */
  readonly correctsMovementId?: StockMovementId;
  /** When the stock change happened in the business. */
  readonly occurredAt: IsoDateTime;
  /** When the central operator recorded it. */
  readonly recordedAt: IsoDateTime;
  readonly recordedByUserId: UserId;
  readonly note?: string;
}

export interface NewStockMovement {
  readonly id: StockMovementId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityDeltaMilli: number;
  readonly reason: StockMovementReason;
  readonly source?: StockMovementSource;
  readonly correctsMovementId?: StockMovementId;
  readonly occurredAt: IsoDateTime;
  readonly recordedByUserId: UserId;
  readonly note?: string;
}

/**
 * Creates a frozen stock movement.
 *
 * `recordedAt` is supplied separately so a caller cannot backdate the audit
 * time by copying the business time.
 */
export function createStockMovement(
  input: NewStockMovement,
  recordedAt: IsoDateTime,
): StockMovement {
  if (!Number.isSafeInteger(input.quantityDeltaMilli) || input.quantityDeltaMilli === 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'Stock movement quantity must be a non-zero integer in thousandths',
    );
  }

  if (!isStockMovementReason(input.reason)) {
    throw new DomainError('INVALID_INPUT', 'Stock movement reason must be a known reason');
  }

  if (input.reason === 'CORRECTION') {
    if (input.correctsMovementId === undefined) {
      throw new DomainError(
        'INVALID_INPUT',
        'A correction must reference the stock movement it corrects',
      );
    }

    if (input.correctsMovementId === input.id) {
      throw new DomainError('INVALID_INPUT', 'A stock movement cannot correct itself');
    }
  } else if (input.correctsMovementId !== undefined) {
    throw new DomainError(
      'INVALID_INPUT',
      'Only a correction may reference a corrected stock movement',
    );
  }

  let source: StockMovementSource | undefined;

  if (input.source !== undefined) {
    if (typeof input.source !== 'object' || input.source === null) {
      throw new DomainError('INVALID_INPUT', 'Stock movement source must be a reference');
    }

    if (!isStockMovementSourceType(input.source.type)) {
      throw new DomainError('INVALID_INPUT', 'Stock movement source type must be a known type');
    }

    const sourceId = input.source.id.trim();

    if (sourceId.length === 0) {
      throw new DomainError('INVALID_INPUT', 'Stock movement source id must not be empty');
    }

    source = Object.freeze({ type: input.source.type, id: sourceId });
  }

  const note = input.note?.trim();

  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    productId: input.productId,
    quantityDeltaMilli: input.quantityDeltaMilli,
    reason: input.reason,
    ...(source === undefined ? {} : { source }),
    ...(input.correctsMovementId === undefined
      ? {}
      : { correctsMovementId: input.correctsMovementId }),
    occurredAt: input.occurredAt,
    recordedAt,
    recordedByUserId: input.recordedByUserId,
    ...(note === undefined || note.length === 0 ? {} : { note }),
  });
}
