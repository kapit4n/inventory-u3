/**
 * Supplier persistence, on both engines, including tenant isolation.
 *
 * SQLite always runs against a temporary migrated file. The PostgreSQL half
 * skips itself when `TEST_DATABASE_URL` is absent, matching the dual-engine
 * repository policy.
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
import { createSupplier, updateSupplier, type Supplier } from '@inventory-u3/domain';
import {
  asOrganizationId,
  asSupplierId,
  type OrganizationId,
  type SupplierId,
} from '@inventory-u3/types';

import { DrizzleSupplierRepository } from '../src/infrastructure/persistence/repositories/supplier-repository.js';
import { createPostgresConnection } from '../src/infrastructure/persistence/postgres/connection.js';
import { SQLiteSupplierRepository } from '../src/infrastructure/persistence/sqlite/repositories/supplier-repository.js';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = '2026-11-09T12:00:00.000Z';

const ORGANIZATION_A = asOrganizationId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const ORGANIZATION_B = asOrganizationId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

describe('supplier repository (SQLite)', () => {
  let dir: string;
  let connection: ReturnType<typeof createSqliteConnection>;
  let repository: SQLiteSupplierRepository;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-supplier-'));
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

    repository = new SQLiteSupplierRepository(connection.db);
  });

  afterAll(() => {
    connection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates and reads a supplier with audit timestamps', async () => {
    const supplier = await repository.create(
      createSupplier(
        {
          id: asSupplierId('a1111111-1111-4111-8111-111111111111'),
          organizationId: ORGANIZATION_A,
          name: '  Central Farms  ',
        },
        NOW,
      ),
    );

    expect(supplier).toMatchObject({
      organizationId: ORGANIZATION_A,
      name: 'Central Farms',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await expect(repository.findById(ORGANIZATION_A, supplier.id)).resolves.toEqual(supplier);
  });

  it('lists only the suppliers of the requested organization, ordered by name', async () => {
    await repository.create(
      createSupplier(
        {
          id: asSupplierId('a2222222-2222-4222-8222-222222222222'),
          organizationId: ORGANIZATION_A,
          name: 'North Fields',
        },
        NOW,
      ),
    );
    await repository.create(
      createSupplier(
        {
          id: asSupplierId('b1111111-1111-4111-8111-111111111111'),
          organizationId: ORGANIZATION_B,
          name: 'Other Tenant',
        },
        NOW,
      ),
    );

    const suppliers = await repository.listByOrganization(ORGANIZATION_A);

    expect(suppliers.map((supplier) => supplier.name)).toEqual(['Central Farms', 'North Fields']);
  });

  it("does not return another organization's supplier by id", async () => {
    const supplier = await repository.create(
      createSupplier(
        {
          id: asSupplierId('a3333333-3333-4333-8333-333333333333'),
          organizationId: ORGANIZATION_A,
          name: 'Isolation Supplier',
        },
        NOW,
      ),
    );

    await expect(repository.findById(ORGANIZATION_B, supplier.id)).resolves.toBeUndefined();
  });

  it('updates only within its organization', async () => {
    const supplier = await repository.create(
      createSupplier(
        {
          id: asSupplierId('a4444444-4444-4444-8444-444444444444'),
          organizationId: ORGANIZATION_A,
          name: 'Editable Supplier',
        },
        NOW,
      ),
    );

    const updated = updateSupplier(
      supplier,
      { name: 'Editable Supplier Renamed', isActive: false },
      '2026-11-09T13:00:00.000Z',
    );
    await expect(repository.update(updated)).resolves.toEqual(updated);
    await expect(repository.findById(ORGANIZATION_A, supplier.id)).resolves.toEqual(updated);

    await expect(
      repository.update({ ...updated, organizationId: ORGANIZATION_B }),
    ).resolves.toBeUndefined();
    await expect(repository.findById(ORGANIZATION_A, supplier.id)).resolves.toEqual(updated);
  });
});

const postgresUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!postgresUrl)('supplier repository (PostgreSQL)', () => {
  let connection: ReturnType<typeof createPostgresConnection>;
  let repository: DrizzleSupplierRepository;
  let organizationA: OrganizationId;
  let organizationB: OrganizationId;
  const supplierIds: SupplierId[] = [];

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
        name: `Supplier Test A ${organizationA}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
      {
        id: organizationB,
        name: `Supplier Test B ${organizationB}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
    ]);

    repository = new DrizzleSupplierRepository(connection.db);
  });

  afterAll(async () => {
    if (connection) {
      if (supplierIds.length > 0) {
        await connection.db
          .delete(pgSchema.suppliers)
          .where(inArray(pgSchema.suppliers.id, supplierIds));
      }
      await connection.db
        .delete(pgSchema.organizations)
        .where(inArray(pgSchema.organizations.id, [organizationA, organizationB]));
      await connection.sql.end({ timeout: 5 });
    }
  });

  async function createTestSupplier(
    organizationId: OrganizationId,
    name: string,
  ): Promise<Supplier> {
    const supplier = createSupplier(
      {
        id: asSupplierId(randomUUID()),
        organizationId,
        name,
      },
      NOW,
    );
    supplierIds.push(supplier.id);
    return repository.create(supplier);
  }

  it('creates, reads and lists suppliers for one organization', async () => {
    const central = await createTestSupplier(organizationA, 'Central Farms');
    const north = await createTestSupplier(organizationA, 'North Fields');
    await createTestSupplier(organizationB, 'Other Tenant');

    await expect(repository.findById(organizationA, central.id)).resolves.toEqual(central);
    await expect(repository.findById(organizationB, central.id)).resolves.toBeUndefined();
    await expect(repository.listByOrganization(organizationA)).resolves.toEqual([central, north]);
  });

  it('updates only within the organization', async () => {
    const supplier = await createTestSupplier(organizationA, 'Editable Supplier');
    const updated = updateSupplier(
      supplier,
      { name: 'Editable Supplier Renamed', isActive: false },
      '2026-11-09T13:00:00.000Z',
    );

    await expect(repository.update(updated)).resolves.toEqual(updated);
    await expect(
      repository.update({ ...updated, organizationId: organizationB }),
    ).resolves.toBeUndefined();
    await expect(repository.findById(organizationA, supplier.id)).resolves.toEqual(updated);
  });
});
