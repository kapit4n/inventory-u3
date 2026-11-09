/**
 * Branch persistence, on PostgreSQL.
 *
 * Every read takes the organization id explicitly. A branch id alone is never
 * trusted to choose the tenant boundary.
 */

import { and, asc, eq } from 'drizzle-orm';

import { branches } from '@inventory-u3/database/schema';
import type { Branch, BranchRepository } from '@inventory-u3/domain';
import {
  asBranchId,
  asOrganizationId,
  type BranchId,
  type IsoDateTime,
  type OrganizationId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type BranchRow = typeof branches.$inferSelect;

export class DrizzleBranchRepository implements BranchRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(organizationId: OrganizationId, branchId: BranchId): Promise<Branch | undefined> {
    const [row] = await this.db
      .select()
      .from(branches)
      .where(and(eq(branches.organizationId, organizationId), eq(branches.id, branchId)))
      .limit(1);

    return row ? toBranch(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly Branch[]> {
    const rows = await this.db
      .select()
      .from(branches)
      .where(eq(branches.organizationId, organizationId))
      .orderBy(asc(branches.name), asc(branches.id));

    return rows.map(toBranch);
  }

  async create(branch: Branch): Promise<Branch> {
    const [row] = await this.db
      .insert(branches)
      .values({
        id: branch.id,
        organizationId: branch.organizationId,
        name: branch.name,
        isActive: branch.isActive,
        createdAt: new Date(branch.createdAt),
        updatedAt: new Date(branch.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Branch insert did not return a row');
    }

    return toBranch(row);
  }
}

function toBranch(row: BranchRow): Branch {
  return {
    id: asBranchId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}
