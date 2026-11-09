/**
 * Branch persistence, on both engines, including the tenant isolation rule.
 *
 * SQLite always runs against a temporary migrated file. The PostgreSQL half
 * skips itself when `TEST_DATABASE_URL` is absent, matching the rest of the
 * repository's dual-engine policy.
 */

import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { inArray } from 'drizzle-orm';

import * as pgSchema from '@inventory-u3/database/schema';
import * as sqliteSchema from '@inventory-u3/database/schema/sqlite';
import { createBranch, type Branch } from '@inventory-u3/domain';
import {
  asBranchId,
  asOrganizationId,
  type BranchId,
  type OrganizationId,
} from '@inventory-u3/types';

import { DrizzleBranchRepository } from '../src/infrastructure/persistence/repositories/branch-repository.js';
import { createPostgresConnection } from '../src/infrastructure/persistence/postgres/connection.js';
import { SQLiteBranchRepository } from '../src/infrastructure/persistence/sqlite/repositories/branch-repository.js';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = '2026-11-09T12:00:00.000Z';

const ORGANIZATION_A = asOrganizationId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const ORGANIZATION_B = asOrganizationId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

describe('branch repository (SQLite)', () => {
  let dir: string;
  let connection: ReturnType<typeof createSqliteConnection>;
  let repository: SQLiteBranchRepository;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-branch-'));
    connection = createSqliteConnection(`sqlite:${path.join(dir, 'inventory.db')}`);
    migrateSqlite(connection.db, {
      migrationsFolder: path.join(here, '../../../database/migrations-sqlite'),
    });

    await connection.db.insert(sqliteSchema.organizations).values([
      {
        id: ORGANIZATION_A,
        name: 'Organization A',
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
      {
        id: ORGANIZATION_B,
        name: 'Organization B',
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
    ]);

    repository = new SQLiteBranchRepository(connection.db);
  });

  afterAll(() => {
    connection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates and reads a branch with its audit timestamps', async () => {
    const branch = await repository.create(
      createBranch(
        {
          id: asBranchId('a1111111-1111-4111-8111-111111111111'),
          organizationId: ORGANIZATION_A,
          name: '  Central Market  ',
        },
        NOW,
      ),
    );

    expect(branch).toMatchObject({
      organizationId: ORGANIZATION_A,
      name: 'Central Market',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await expect(repository.findById(ORGANIZATION_A, branch.id)).resolves.toEqual(branch);
  });

  it('lists only the branches of the requested organization, ordered by name', async () => {
    await repository.create(
      createBranch(
        {
          id: asBranchId('a2222222-2222-4222-8222-222222222222'),
          organizationId: ORGANIZATION_A,
          name: 'North Market',
        },
        NOW,
      ),
    );
    await repository.create(
      createBranch(
        {
          id: asBranchId('b1111111-1111-4111-8111-111111111111'),
          organizationId: ORGANIZATION_B,
          name: 'Other Tenant',
        },
        NOW,
      ),
    );

    const branches = await repository.listByOrganization(ORGANIZATION_A);

    expect(branches.map((branch) => branch.name)).toEqual(['Central Market', 'North Market']);
  });

  it("does not return another organization's branch by id", async () => {
    const branch = await repository.create(
      createBranch(
        {
          id: asBranchId('a3333333-3333-4333-8333-333333333333'),
          organizationId: ORGANIZATION_A,
          name: 'Isolation Market',
        },
        NOW,
      ),
    );

    await expect(repository.findById(ORGANIZATION_B, branch.id)).resolves.toBeUndefined();
  });
});

const postgresUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!postgresUrl)('branch repository (PostgreSQL)', () => {
  let connection: ReturnType<typeof createPostgresConnection>;
  let repository: DrizzleBranchRepository;
  let organizationA: OrganizationId;
  let organizationB: OrganizationId;
  const branchIds: BranchId[] = [];

  beforeAll(async () => {
    organizationA = asOrganizationId(randomUUID());
    organizationB = asOrganizationId(randomUUID());

    connection = createPostgresConnection(postgresUrl as string);
    await migratePostgres(connection.db, {
      migrationsFolder: path.join(here, '../../../database/migrations'),
    });

    await connection.db.insert(pgSchema.organizations).values([
      {
        id: organizationA,
        name: `Branch Test A ${organizationA}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
      {
        id: organizationB,
        name: `Branch Test B ${organizationB}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
    ]);

    repository = new DrizzleBranchRepository(connection.db);
  });

  afterAll(async () => {
    if (connection) {
      if (branchIds.length > 0) {
        await connection.db
          .delete(pgSchema.branches)
          .where(inArray(pgSchema.branches.id, branchIds));
      }
      await connection.db
        .delete(pgSchema.organizations)
        .where(inArray(pgSchema.organizations.id, [organizationA, organizationB]));
      await connection.sql.end({ timeout: 5 });
    }
  });

  async function createTestBranch(organizationId: OrganizationId, name: string): Promise<Branch> {
    const branch = createBranch(
      {
        id: asBranchId(randomUUID()),
        organizationId,
        name,
      },
      NOW,
    );
    branchIds.push(branch.id);
    return repository.create(branch);
  }

  it('creates, reads and lists branches for one organization', async () => {
    const central = await createTestBranch(organizationA, 'Central Market');
    await createTestBranch(organizationA, 'North Market');
    await createTestBranch(organizationB, 'Other Tenant');

    await expect(repository.findById(organizationA, central.id)).resolves.toEqual(central);

    const branches = await repository.listByOrganization(organizationA);
    expect(branches.map((branch) => branch.name)).toEqual(['Central Market', 'North Market']);
  });

  it("does not return another organization's branch by id", async () => {
    const branch = await createTestBranch(organizationA, 'Isolation Market');

    await expect(repository.findById(organizationB, branch.id)).resolves.toBeUndefined();
  });
});
