import { DomainError, notFound, type Repositories } from '@inventory-u3/domain';
import type { BranchId, OrganizationId, ProductId } from '@inventory-u3/types';

/**
 * New inventory operations may only target an active branch and product in the
 * caller's organization. History reads stay possible for inactive records.
 */
export async function requireActiveStockTargets(
  repositories: Repositories,
  organizationId: OrganizationId,
  branchId: BranchId,
  productId: ProductId,
): Promise<void> {
  const branch = await repositories.branches.findById(organizationId, branchId);
  if (!branch) {
    throw notFound('Branch', branchId);
  }
  if (!branch.isActive) {
    throw new DomainError('INVALID_STATE', 'Inactive branches cannot receive stock operations', {
      branchId,
    });
  }

  const product = await repositories.products.findById(organizationId, productId);
  if (!product) {
    throw notFound('Product', productId);
  }
  if (!product.isActive) {
    throw new DomainError('INVALID_STATE', 'Inactive products cannot receive stock operations', {
      productId,
    });
  }
}
