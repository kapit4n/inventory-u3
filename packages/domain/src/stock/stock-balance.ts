/**
 * The quantity one branch currently has on hand for one product.
 *
 * The balance is a read model derived from the append-only movement ledger
 * (ADR 0041). Quantities are exact integer thousandths; there is no cache table
 * in M4.
 */

import type { BranchId, IsoDateTime, OrganizationId, ProductId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface StockBalance {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityOnHandMilli: number;
  readonly updatedAt: IsoDateTime;
}

/**
 * Refuses a stock change that would leave a negative branch/product balance.
 *
 * The ledger itself stores signed movements; this rule belongs to the use case
 * that knows the current balance and the operation about to be recorded.
 */
export function assertStockDoesNotGoNegative(
  currentQuantityMilli: number,
  deltaQuantityMilli: number,
  details: Record<string, unknown> = {},
): void {
  if (!Number.isSafeInteger(currentQuantityMilli) || !Number.isSafeInteger(deltaQuantityMilli)) {
    throw new DomainError('INVALID_INPUT', 'Stock quantities must be integers in thousandths');
  }

  const resultingQuantityMilli = currentQuantityMilli + deltaQuantityMilli;

  if (!Number.isSafeInteger(resultingQuantityMilli)) {
    throw new DomainError('INVALID_INPUT', 'Stock quantity is too large');
  }

  if (resultingQuantityMilli < 0) {
    throw new DomainError('INSUFFICIENT_STOCK', 'The operation would leave negative stock', {
      currentQuantityMilli,
      deltaQuantityMilli,
      resultingQuantityMilli,
      ...details,
    });
  }
}
