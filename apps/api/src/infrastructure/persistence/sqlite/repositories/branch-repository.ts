/**
 * Branch persistence, on SQLite — the twin of
 * `repositories/branch-repository.ts`.
 */

import { and, asc, eq } from 'drizzle-orm';

import { branches } from '@inventory-u3/database/schema/sqlite';
import type { Branch, BranchRepository } from '@inventory-u3/domain';
import {
  asBranchId,
  asOrganizationId,
  type BranchId,
  type IsoDateTime,
  type OrganizationId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type BranchRow = typeof branches.$inferSelect;

export class SQLiteBranchRepository implements BranchRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(organizationId: OrganizationId, branchId: BranchId): Promise<Branch | undefined> {
    const [row] = await this.db
      .select()
      .from(branches)
      .where(and(eq(branches.organizationId, organizationId), eq(branches.id, branchId)))
      .limit(1);

    return row ? toBranch(row) : undefined;
  }

  async findByName(organizationId: OrganizationId, name: string): Promise<Branch | undefined> {
    const [row] = await this.db
      .select()
      .from(branches)
      .where(and(eq(branches.organizationId, organizationId), eq(branches.name, name)))
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

  async update(branch: Branch): Promise<Branch | undefined> {
    const [row] = await this.db
      .update(branches)
      .set({
        name: branch.name,
        isActive: branch.isActive,
        updatedAt: new Date(branch.updatedAt),
      })
      .where(and(eq(branches.organizationId, branch.organizationId), eq(branches.id, branch.id)))
      .returning();

    return row ? toBranch(row) : undefined;
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
