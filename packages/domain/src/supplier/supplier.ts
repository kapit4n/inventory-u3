/**
 * A supplier is an organization-wide provider of products delivered to branches.
 *
 * The supplier is master data, not a purchase: it does not belong to one branch,
 * because the same provider can deliver to several branches. Contact details,
 * tax identifiers, payment terms and accounts payable are outside this slice.
 * Suppliers are deactivated rather than deleted so later purchases keep their
 * reference.
 */

import type { IsoDateTime, OrganizationId, SupplierId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface Supplier {
  readonly id: SupplierId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewSupplier {
  readonly id: SupplierId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly isActive?: boolean;
}

export interface SupplierUpdate {
  readonly name: string;
  readonly isActive: boolean;
}

export const SUPPLIER_NAME_MAX_LENGTH = 160;

export function createSupplier(input: NewSupplier, now: IsoDateTime): Supplier {
  return {
    id: input.id,
    organizationId: input.organizationId,
    name: validateSupplierName(input.name),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Edit the mutable part of a supplier.
 *
 * Suppliers are deactivated rather than deleted so later purchases keep a
 * reference to the provider.
 */
export function updateSupplier(
  supplier: Supplier,
  update: SupplierUpdate,
  at: IsoDateTime,
): Supplier {
  return {
    ...supplier,
    name: validateSupplierName(update.name),
    isActive: update.isActive,
    updatedAt: at,
  };
}

function validateSupplierName(candidate: string): string {
  const name = candidate.trim();

  if (name.length === 0 || name.length > SUPPLIER_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Supplier name must be between 1 and ${SUPPLIER_NAME_MAX_LENGTH} characters`,
    );
  }

  return name;
}
