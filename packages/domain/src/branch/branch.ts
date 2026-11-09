/**
 * A branch is one physical business location. It belongs to exactly one
 * organization and owns its inventory independently from the other branches.
 *
 * The entity is deliberately small for M1: identity, tenant ownership, a display
 * name and an active flag. Address, codes and branch-specific settings can be
 * added when a confirmed requirement needs them.
 */

import type { BranchId, IsoDateTime, OrganizationId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface Branch {
  readonly id: BranchId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewBranch {
  readonly id: BranchId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly isActive?: boolean;
}

export const BRANCH_NAME_MAX_LENGTH = 120;

export function createBranch(input: NewBranch, now: IsoDateTime): Branch {
  const name = input.name.trim();

  if (name.length === 0 || name.length > BRANCH_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Branch name must be between 1 and ${BRANCH_NAME_MAX_LENGTH} characters`,
    );
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    name,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}
