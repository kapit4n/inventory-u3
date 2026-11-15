/**
 * Stock that was damaged, discarded or otherwise lost.
 *
 * The recorded quantity is always positive in the product's inventory unit;
 * the stock movement written by the use case is negative. Keeping the waste
 * entry separate from the movement preserves the reason and count evidence.
 */

import type {
  BranchId,
  InventoryWasteId,
  IsoDateTime,
  OrganizationId,
  ProductId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { assertStockInteger, normalizeStockNote, normalizeStockReason } from './stock-entry.js';

export interface InventoryWaste {
  readonly id: InventoryWasteId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  /** Positive quantity in thousandths of the product's inventory unit. */
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly occurredAt: IsoDateTime;
  readonly recordedAt: IsoDateTime;
  readonly recordedByUserId: UserId;
}

export interface NewInventoryWaste {
  readonly id: InventoryWasteId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityMilli: number;
  readonly reason: string;
  readonly note?: string;
  readonly occurredAt: IsoDateTime;
  readonly recordedByUserId: UserId;
}

export function createInventoryWaste(
  input: NewInventoryWaste,
  recordedAt: IsoDateTime,
): InventoryWaste {
  assertStockInteger(input.quantityMilli, 'Waste quantity');

  if (input.quantityMilli <= 0) {
    throw new DomainError('INVALID_INPUT', 'Waste quantity must be greater than zero');
  }

  const reason = normalizeStockReason(input.reason);
  const note = normalizeStockNote(input.note);

  return Object.freeze({
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    productId: input.productId,
    quantityMilli: input.quantityMilli,
    reason,
    ...(note === undefined ? {} : { note }),
    occurredAt: input.occurredAt,
    recordedAt,
    recordedByUserId: input.recordedByUserId,
  });
}
