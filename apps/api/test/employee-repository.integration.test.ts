/**
 * Employee persistence, on both engines, including tenant and branch assignment.
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
import { createEmployee, updateEmployee, type Employee } from '@inventory-u3/domain';
import {
  asBranchId,
  asEmployeeId,
  asOrganizationId,
  type BranchId,
  type EmployeeId,
  type OrganizationId,
} from '@inventory-u3/types';

import { DrizzleEmployeeRepository } from '../src/infrastructure/persistence/repositories/employee-repository.js';
import { createPostgresConnection } from '../src/infrastructure/persistence/postgres/connection.js';
import { SQLiteEmployeeRepository } from '../src/infrastructure/persistence/sqlite/repositories/employee-repository.js';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = '2026-11-09T12:00:00.000Z';

const ORGANIZATION_A = asOrganizationId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const ORGANIZATION_B = asOrganizationId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const BRANCH_A = asBranchId('a1111111-1111-4111-8111-111111111111');
const BRANCH_A_OTHER = asBranchId('a2222222-2222-4222-8222-222222222222');
const BRANCH_B = asBranchId('b1111111-1111-4111-8111-111111111111');

describe('employee repository (SQLite)', () => {
  let dir: string;
  let connection: ReturnType<typeof createSqliteConnection>;
  let repository: SQLiteEmployeeRepository;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-employee-'));
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
    await connection.db.insert(sqliteSchema.branches).values([
      { id: BRANCH_A, organizationId: ORGANIZATION_A, name: 'Branch A' },
      { id: BRANCH_A_OTHER, organizationId: ORGANIZATION_A, name: 'Branch A Other' },
      { id: BRANCH_B, organizationId: ORGANIZATION_B, name: 'Branch B' },
    ]);

    repository = new SQLiteEmployeeRepository(connection.db);
  });

  afterAll(() => {
    connection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('creates and reads an employee with branch and audit timestamps', async () => {
    const employee = await repository.create(
      createEmployee(
        {
          id: asEmployeeId('a3333333-3333-4333-8333-333333333333'),
          organizationId: ORGANIZATION_A,
          branchId: BRANCH_A,
          fullName: '  Maria Lopez  ',
        },
        NOW,
      ),
    );

    expect(employee).toMatchObject({
      organizationId: ORGANIZATION_A,
      branchId: BRANCH_A,
      fullName: 'Maria Lopez',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await expect(repository.findById(ORGANIZATION_A, employee.id)).resolves.toEqual(employee);
  });

  it('lists only the employees of the requested organization, ordered by name', async () => {
    await repository.create(
      createEmployee(
        {
          id: asEmployeeId('a4444444-4444-4444-8444-444444444444'),
          organizationId: ORGANIZATION_A,
          branchId: BRANCH_A_OTHER,
          fullName: 'Ana Alvarez',
        },
        NOW,
      ),
    );
    await repository.create(
      createEmployee(
        {
          id: asEmployeeId('b2222222-2222-4222-8222-222222222222'),
          organizationId: ORGANIZATION_B,
          branchId: BRANCH_B,
          fullName: 'Other Tenant',
        },
        NOW,
      ),
    );

    const employees = await repository.listByOrganization(ORGANIZATION_A);

    expect(employees.map((employee) => employee.fullName)).toEqual(['Ana Alvarez', 'Maria Lopez']);
  });

  it("does not return another organization's employee by id", async () => {
    const employee = await repository.create(
      createEmployee(
        {
          id: asEmployeeId('a5555555-5555-4555-8555-555555555555'),
          organizationId: ORGANIZATION_A,
          branchId: BRANCH_A,
          fullName: 'Isolation Employee',
        },
        NOW,
      ),
    );

    await expect(repository.findById(ORGANIZATION_B, employee.id)).resolves.toBeUndefined();
  });

  it('reassigns branches and updates only within its organization', async () => {
    const employee = await repository.create(
      createEmployee(
        {
          id: asEmployeeId('a6666666-6666-4666-8666-666666666666'),
          organizationId: ORGANIZATION_A,
          branchId: BRANCH_A,
          fullName: 'Editable Employee',
        },
        NOW,
      ),
    );

    const updated = updateEmployee(
      employee,
      {
        branchId: BRANCH_A_OTHER,
        fullName: 'Editable Employee Renamed',
        isActive: false,
      },
      '2026-11-09T13:00:00.000Z',
    );
    await expect(repository.update(updated)).resolves.toEqual(updated);
    await expect(repository.findById(ORGANIZATION_A, employee.id)).resolves.toEqual(updated);

    await expect(
      repository.update({ ...updated, organizationId: ORGANIZATION_B }),
    ).resolves.toBeUndefined();
    await expect(repository.findById(ORGANIZATION_A, employee.id)).resolves.toEqual(updated);
  });
});

const postgresUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!postgresUrl)('employee repository (PostgreSQL)', () => {
  let connection: ReturnType<typeof createPostgresConnection>;
  let repository: DrizzleEmployeeRepository;
  let organizationA: OrganizationId;
  let organizationB: OrganizationId;
  let branchA: BranchId;
  let branchAOther: BranchId;
  let branchB: BranchId;
  const employeeIds: EmployeeId[] = [];

  beforeAll(async () => {
    organizationA = asOrganizationId(randomUUID());
    organizationB = asOrganizationId(randomUUID());
    branchA = asBranchId(randomUUID());
    branchAOther = asBranchId(randomUUID());
    branchB = asBranchId(randomUUID());

    connection = createPostgresConnection(postgresUrl as string);
    await migratePostgres(connection.db, {
      migrationsFolder: path.join(here, '../../../database/migrations'),
    });

    await connection.db.insert(pgSchema.organizations).values([
      {
        id: organizationA,
        name: `Employee Test A ${organizationA}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
      {
        id: organizationB,
        name: `Employee Test B ${organizationB}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
    ]);
    await connection.db.insert(pgSchema.branches).values([
      { id: branchA, organizationId: organizationA, name: 'Branch A' },
      { id: branchAOther, organizationId: organizationA, name: 'Branch A Other' },
      { id: branchB, organizationId: organizationB, name: 'Branch B' },
    ]);

    repository = new DrizzleEmployeeRepository(connection.db);
  });

  afterAll(async () => {
    if (connection) {
      if (employeeIds.length > 0) {
        await connection.db
          .delete(pgSchema.employees)
          .where(inArray(pgSchema.employees.id, employeeIds));
      }
      await connection.db
        .delete(pgSchema.branches)
        .where(inArray(pgSchema.branches.id, [branchA, branchAOther, branchB]));
      await connection.db
        .delete(pgSchema.organizations)
        .where(inArray(pgSchema.organizations.id, [organizationA, organizationB]));
      await connection.sql.end({ timeout: 5 });
    }
  });

  async function createTestEmployee(
    organizationId: OrganizationId,
    branchId: BranchId,
    fullName: string,
  ): Promise<Employee> {
    const employee = createEmployee(
      {
        id: asEmployeeId(randomUUID()),
        organizationId,
        branchId,
        fullName,
      },
      NOW,
    );
    employeeIds.push(employee.id);
    return repository.create(employee);
  }

  it('creates, reads and lists employees for one organization', async () => {
    const maria = await createTestEmployee(organizationA, branchA, 'Maria Lopez');
    const ana = await createTestEmployee(organizationA, branchAOther, 'Ana Alvarez');
    await createTestEmployee(organizationB, branchB, 'Other Tenant');

    await expect(repository.findById(organizationA, maria.id)).resolves.toEqual(maria);
    await expect(repository.findById(organizationB, maria.id)).resolves.toBeUndefined();
    await expect(repository.listByOrganization(organizationA)).resolves.toEqual([ana, maria]);
  });

  it('reassigns a branch and updates only within the organization', async () => {
    const employee = await createTestEmployee(organizationA, branchA, 'Editable Employee');
    const updated = updateEmployee(
      employee,
      {
        branchId: branchAOther,
        fullName: 'Editable Employee Renamed',
        isActive: false,
      },
      '2026-11-09T13:00:00.000Z',
    );

    await expect(repository.update(updated)).resolves.toEqual(updated);
    await expect(
      repository.update({ ...updated, organizationId: organizationB }),
    ).resolves.toBeUndefined();
    await expect(repository.findById(organizationA, employee.id)).resolves.toEqual(updated);
  });
});
