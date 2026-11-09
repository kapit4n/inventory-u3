/**
 * The quantity one branch currently has on hand for one product.
 *
 * This is a read-model shape only. Whether it is derived from the movement
 * ledger or maintained as a cached projection is still open (BQ-07), so this
 * task deliberately provides no factory, table or calculation.
 */

import type { BranchId, IsoDateTime, OrganizationId, ProductId } from '@inventory-u3/types';

export interface StockBalance {
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly productId: ProductId;
  readonly quantityOnHand: number;
  readonly updatedAt: IsoDateTime;
}
