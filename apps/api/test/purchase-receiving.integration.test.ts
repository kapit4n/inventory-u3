/**
 * Purchase persistence and receiving, on both engines.
 *
 * SQLite always runs against a temporary migrated file. The PostgreSQL half
 * skips itself when `TEST_DATABASE_URL` is absent.
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
import {
  cancelPurchase,
  correctPurchase,
  createPurchase,
  createPurchaseCorrection,
  type Clock,
  type IdGenerator,
  type Purchase,
  type Repositories,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asMeasurementUnitId,
  asOrganizationId,
  asProductCategoryId,
  asProductId,
  asPurchaseCorrectionId,
  asPurchaseId,
  asPurchaseItemId,
  asSupplierId,
  asUserId,
  type BranchId,
  type MeasurementUnitId,
  type OrganizationId,
  type ProductCategoryId,
  type ProductId,
  type SupplierId,
  type UserId,
} from '@inventory-u3/types';

import { receivePurchaseUseCase } from '../src/application/purchase/receive-purchase.js';
import {
  repositoriesFor,
  DrizzleUnitOfWork,
} from '../src/infrastructure/persistence/postgres/unit-of-work.js';
import { createPostgresConnection } from '../src/infrastructure/persistence/postgres/connection.js';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { sqliteRepositoriesFor } from '../src/infrastructure/persistence/sqlite/repositories.js';
import { SQLiteUnitOfWork } from '../src/infrastructure/persistence/sqlite/unit-of-work.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = '2026-11-13T12:00:00.000Z';
const RECEIVED_AT = '2026-11-13T13:00:00.000Z';

interface Scenario {
  readonly organizationA: OrganizationId;
  readonly organizationB: OrganizationId;
  readonly userA: UserId;
  readonly branchA: BranchId;
  readonly branchB: BranchId;
  readonly supplierA: SupplierId;
  readonly unitA: MeasurementUnitId;
  readonly unitB: MeasurementUnitId;
  readonly categoryA: ProductCategoryId;
  readonly products: readonly [ProductId, ProductId];
}

interface Harness {
  readonly repositories: Repositories;
  readonly unitOfWork: UnitOfWork;
  readonly scenario: Scenario;
  readonly ids: IdGenerator;
  readonly clock: Clock;
}

function createDraft(scenario: Scenario): Purchase {
  return createPurchase(
    {
      id: asPurchaseId(randomUUID()),
      organizationId: scenario.organizationA,
      branchId: scenario.branchA,
      supplierId: scenario.supplierA,
      deliveryDate: '2026-11-13',
      currency: 'USD',
      note: 'Receiving test',
      createdByUserId: scenario.userA,
      items: [
        {
          id: asPurchaseItemId(randomUUID()),
          productId: scenario.products[0],
          unitId: scenario.unitA,
          quantityMilli: 12_500,
          unitPriceMinor: 350,
        },
        {
          id: asPurchaseItemId(randomUUID()),
          productId: scenario.products[1],
          unitId: scenario.unitA,
          quantityMilli: 1_500,
          unitPriceMinor: 333,
        },
      ],
    },
    NOW,
  );
}

function fixedIds(): IdGenerator {
  return { nextId: () => randomUUID() };
}

const fixedClock: Clock = { now: () => RECEIVED_AT };

async function exercisePurchaseLifecycle(harness: Harness): Promise<void> {
  const { repositories, unitOfWork, scenario } = harness;
  const draft = createDraft(scenario);
  const saved = await repositories.purchases.create(draft);

  expect(saved).toEqual(draft);
  await expect(repositories.purchases.findById(scenario.organizationA, saved.id)).resolves.toEqual(
    draft,
  );
  await expect(
    repositories.purchases.findById(scenario.organizationB, saved.id),
  ).resolves.toBeUndefined();
  await expect(repositories.purchases.listByOrganization(scenario.organizationA)).resolves.toEqual([
    draft,
  ]);
  await expect(
    repositories.purchases.listByBranch(scenario.organizationA, scenario.branchB),
  ).resolves.toEqual([]);

  const receiptSource = { type: 'PURCHASE_RECEIPT' as const, id: saved.id };
  await expect(
    repositories.stockMovements.listBySource(scenario.organizationA, receiptSource),
  ).resolves.toEqual([]);

  const received = await receivePurchaseUseCase(
    {
      organizationId: scenario.organizationA,
      purchaseId: saved.id,
      receivedByUserId: scenario.userA,
    },
    { unitOfWork, ids: harness.ids, clock: harness.clock },
  );

  expect(received).toMatchObject({
    id: saved.id,
    status: 'RECEIVED',
    receivedByUserId: scenario.userA,
    receivedAt: RECEIVED_AT,
    updatedAt: RECEIVED_AT,
    totalMinor: 4_875,
  });

  const movements = await repositories.stockMovements.listBySource(
    scenario.organizationA,
    receiptSource,
  );
  expect(movements).toHaveLength(2);
  expect(
    movements
      .map((movement) => ({
        quantityDelta: movement.quantityDelta,
        reason: movement.reason,
        source: movement.source,
        recordedAt: movement.recordedAt,
        recordedByUserId: movement.recordedByUserId,
      }))
      .sort((left, right) => left.quantityDelta - right.quantityDelta),
  ).toEqual([
    {
      quantityDelta: 1.5,
      reason: 'RECEIVING',
      source: { type: 'PURCHASE_RECEIPT', id: saved.id },
      recordedAt: RECEIVED_AT,
      recordedByUserId: scenario.userA,
    },
    {
      quantityDelta: 12.5,
      reason: 'RECEIVING',
      source: { type: 'PURCHASE_RECEIPT', id: saved.id },
      recordedAt: RECEIVED_AT,
      recordedByUserId: scenario.userA,
    },
  ]);
  await expect(
    repositories.stockMovements.listBySource(scenario.organizationB, receiptSource),
  ).resolves.toEqual([]);

  await expect(
    receivePurchaseUseCase(
      {
        organizationId: scenario.organizationA,
        purchaseId: saved.id,
        receivedByUserId: scenario.userA,
      },
      { unitOfWork, ids: harness.ids, clock: harness.clock },
    ),
  ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  await expect(
    repositories.stockMovements.listBySource(scenario.organizationA, receiptSource),
  ).resolves.toHaveLength(2);

  const cancellable = createDraft(scenario);
  await repositories.purchases.create(cancellable);
  await expect(
    repositories.purchases.markCancelled(scenario.organizationA, cancellable.id, RECEIVED_AT),
  ).resolves.toMatchObject({ status: 'CANCELLED', cancelledAt: RECEIVED_AT });
  await expect(
    repositories.purchases.markReceived(scenario.organizationB, cancellable.id, {
      receivedByUserId: scenario.userA,
      receivedAt: RECEIVED_AT,
    }),
  ).resolves.toBeUndefined();

  const correctable = createDraft(scenario);
  await repositories.purchases.create(correctable);
  await repositories.purchases.markReceived(scenario.organizationA, correctable.id, {
    receivedByUserId: scenario.userA,
    receivedAt: RECEIVED_AT,
  });
  const correction = createPurchaseCorrection(
    {
      id: asPurchaseCorrectionId(randomUUID()),
      organizationId: scenario.organizationA,
      purchaseId: correctable.id,
      correctedByUserId: scenario.userA,
      reason: 'Wrong delivery recorded',
      beforeTotalMinor: correctable.totalMinor,
    },
    RECEIVED_AT,
  );
  await repositories.purchaseCorrections.create(correction);
  await expect(
    repositories.purchaseCorrections.findByPurchaseId(scenario.organizationA, correctable.id),
  ).resolves.toEqual(correction);
  const correctedPurchase = await repositories.purchases.findById(
    scenario.organizationA,
    correctable.id,
  );
  expect(correctedPurchase).toBeDefined();
  const corrected = correctPurchase(correctedPurchase!, correction, RECEIVED_AT);
  await expect(
    repositories.purchases.markCorrected(scenario.organizationA, correctable.id, {
      correctedByUserId: scenario.userA,
      correctedAt: RECEIVED_AT,
    }),
  ).resolves.toMatchObject({ status: 'CORRECTED', correctedAt: RECEIVED_AT });
  expect(corrected.status).toBe('CORRECTED');
  await expect(
    repositories.purchases.markReceived(scenario.organizationA, correctable.id, {
      receivedByUserId: scenario.userA,
      receivedAt: RECEIVED_AT,
    }),
  ).resolves.toBeUndefined();

  const cancelledDraft = cancelPurchase(cancellable, RECEIVED_AT);
  expect(cancelledDraft.status).toBe('CANCELLED');
}

describe('purchase receiving (SQLite)', () => {
  let dir: string;
  let connection: ReturnType<typeof createSqliteConnection>;
  let harness: Harness;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-purchase-'));
    connection = createSqliteConnection(`sqlite:${path.join(dir, 'inventory.db')}`);
    migrateSqlite(connection.db, {
      migrationsFolder: path.join(here, '../../../database/migrations-sqlite'),
    });

    const scenario = await seedSqlite(connection.db);
    const repositories = sqliteRepositoriesFor(connection.db);
    harness = {
      repositories,
      unitOfWork: new SQLiteUnitOfWork(connection.client, connection.db, sqliteRepositoriesFor),
      scenario,
      ids: fixedIds(),
      clock: fixedClock,
    };
  });

  afterAll(() => {
    connection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('persists and receives a multi-line purchase exactly once', async () => {
    await exercisePurchaseLifecycle(harness);
  });

  it('refuses a purchase line unit that is not the product inventory unit', async () => {
    const scenario = harness.scenario;
    const draft = createPurchase(
      {
        id: asPurchaseId(randomUUID()),
        organizationId: scenario.organizationA,
        branchId: scenario.branchA,
        supplierId: scenario.supplierA,
        deliveryDate: '2026-11-13',
        currency: 'USD',
        createdByUserId: scenario.userA,
        items: [
          {
            id: asPurchaseItemId(randomUUID()),
            productId: scenario.products[0],
            unitId: scenario.unitB,
            quantityMilli: 1_000,
            unitPriceMinor: 100,
          },
        ],
      },
      NOW,
    );
    await harness.repositories.purchases.create(draft);

    await expect(
      receivePurchaseUseCase(
        {
          organizationId: scenario.organizationA,
          purchaseId: draft.id,
          receivedByUserId: scenario.userA,
        },
        { unitOfWork: harness.unitOfWork, ids: harness.ids, clock: harness.clock },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      harness.repositories.purchases.findById(scenario.organizationA, draft.id),
    ).resolves.toMatchObject({ status: 'DRAFT' });
  });
});

async function seedSqlite(db: ReturnType<typeof createSqliteConnection>['db']): Promise<Scenario> {
  const scenario = scenarioIds();
  await db.insert(sqliteSchema.organizations).values([
    {
      id: scenario.organizationA,
      name: 'Purchase Test A',
      timezone: 'UTC',
      currency: 'USD',
      isActive: true,
    },
    {
      id: scenario.organizationB,
      name: 'Purchase Test B',
      timezone: 'UTC',
      currency: 'USD',
      isActive: true,
    },
  ]);
  await db.insert(sqliteSchema.users).values([
    {
      id: scenario.userA,
      organizationId: scenario.organizationA,
      email: `purchase-${scenario.userA}@test.local`,
      fullName: 'Purchase Tester',
      role: 'ADMINISTRATOR',
      isActive: true,
    },
  ]);
  await db.insert(sqliteSchema.branches).values([
    { id: scenario.branchA, organizationId: scenario.organizationA, name: 'Main' },
    { id: scenario.branchB, organizationId: scenario.organizationA, name: 'Second' },
  ]);
  await db.insert(sqliteSchema.suppliers).values({
    id: scenario.supplierA,
    organizationId: scenario.organizationA,
    name: 'Supplier A',
  });
  await db.insert(sqliteSchema.measurementUnits).values([
    {
      id: scenario.unitA,
      organizationId: scenario.organizationA,
      code: 'kg',
      name: 'Kilogram',
    },
    {
      id: scenario.unitB,
      organizationId: scenario.organizationA,
      code: 'box',
      name: 'Box',
    },
  ]);
  await db.insert(sqliteSchema.productCategories).values({
    id: scenario.categoryA,
    organizationId: scenario.organizationA,
    name: 'Fruit',
  });
  await db.insert(sqliteSchema.products).values(
    scenario.products.map((productId, index) => ({
      id: productId,
      organizationId: scenario.organizationA,
      categoryId: scenario.categoryA,
      name: `Product ${index + 1}`,
      kind: 'RAW' as const,
      inventoryUnitId: scenario.unitA,
      salesUnitId: scenario.unitA,
      purchaseUnitId: scenario.unitA,
    })),
  );
  return scenario;
}

const postgresUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!postgresUrl)('purchase receiving (PostgreSQL)', () => {
  let connection: ReturnType<typeof createPostgresConnection>;
  let harness: Harness;

  beforeAll(async () => {
    connection = createPostgresConnection(postgresUrl as string);
    await migratePostgres(connection.db, {
      migrationsFolder: path.join(here, '../../../database/migrations'),
    });

    const scenario = await seedPostgres(connection.db);
    harness = {
      repositories: repositoriesFor(connection.db),
      unitOfWork: new DrizzleUnitOfWork(connection.db),
      scenario,
      ids: fixedIds(),
      clock: fixedClock,
    };
  });

  afterAll(async () => {
    if (connection) {
      await connection.db
        .delete(pgSchema.organizations)
        .where(
          inArray(pgSchema.organizations.id, [
            harness.scenario.organizationA,
            harness.scenario.organizationB,
          ]),
        );
      await connection.sql.end({ timeout: 5 });
    }
  });

  it('persists and receives a multi-line purchase exactly once', async () => {
    await exercisePurchaseLifecycle(harness);
  });

  it('refuses a purchase line unit that is not the product inventory unit', async () => {
    const scenario = harness.scenario;
    const draft = createPurchase(
      {
        id: asPurchaseId(randomUUID()),
        organizationId: scenario.organizationA,
        branchId: scenario.branchA,
        supplierId: scenario.supplierA,
        deliveryDate: '2026-11-13',
        currency: 'USD',
        createdByUserId: scenario.userA,
        items: [
          {
            id: asPurchaseItemId(randomUUID()),
            productId: scenario.products[0],
            unitId: scenario.unitB,
            quantityMilli: 1_000,
            unitPriceMinor: 100,
          },
        ],
      },
      NOW,
    );
    await harness.repositories.purchases.create(draft);

    await expect(
      receivePurchaseUseCase(
        {
          organizationId: scenario.organizationA,
          purchaseId: draft.id,
          receivedByUserId: scenario.userA,
        },
        { unitOfWork: harness.unitOfWork, ids: harness.ids, clock: harness.clock },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      harness.repositories.purchases.findById(scenario.organizationA, draft.id),
    ).resolves.toMatchObject({ status: 'DRAFT' });
  });
});

async function seedPostgres(
  db: ReturnType<typeof createPostgresConnection>['db'],
): Promise<Scenario> {
  const scenario = scenarioIds();
  await db.insert(pgSchema.organizations).values([
    {
      id: scenario.organizationA,
      name: `Purchase Test A ${scenario.organizationA}`,
      timezone: 'UTC',
      currency: 'USD',
      isActive: true,
    },
    {
      id: scenario.organizationB,
      name: `Purchase Test B ${scenario.organizationB}`,
      timezone: 'UTC',
      currency: 'USD',
      isActive: true,
    },
  ]);
  await db.insert(pgSchema.users).values({
    id: scenario.userA,
    organizationId: scenario.organizationA,
    email: `purchase-${scenario.userA}@test.local`,
    fullName: 'Purchase Tester',
    role: 'ADMINISTRATOR',
    isActive: true,
  });
  await db.insert(pgSchema.branches).values([
    { id: scenario.branchA, organizationId: scenario.organizationA, name: 'Main' },
    { id: scenario.branchB, organizationId: scenario.organizationA, name: 'Second' },
  ]);
  await db.insert(pgSchema.suppliers).values({
    id: scenario.supplierA,
    organizationId: scenario.organizationA,
    name: 'Supplier A',
  });
  await db.insert(pgSchema.measurementUnits).values([
    {
      id: scenario.unitA,
      organizationId: scenario.organizationA,
      code: 'kg',
      name: 'Kilogram',
    },
    {
      id: scenario.unitB,
      organizationId: scenario.organizationA,
      code: 'box',
      name: 'Box',
    },
  ]);
  await db.insert(pgSchema.productCategories).values({
    id: scenario.categoryA,
    organizationId: scenario.organizationA,
    name: 'Fruit',
  });
  await db.insert(pgSchema.products).values(
    scenario.products.map((productId, index) => ({
      id: productId,
      organizationId: scenario.organizationA,
      categoryId: scenario.categoryA,
      name: `Product ${index + 1}`,
      kind: 'RAW' as const,
      inventoryUnitId: scenario.unitA,
      salesUnitId: scenario.unitA,
      purchaseUnitId: scenario.unitA,
    })),
  );
  return scenario;
}

function scenarioIds(): Scenario {
  return {
    organizationA: asOrganizationId(randomUUID()),
    organizationB: asOrganizationId(randomUUID()),
    userA: asUserId(randomUUID()),
    branchA: asBranchId(randomUUID()),
    branchB: asBranchId(randomUUID()),
    supplierA: asSupplierId(randomUUID()),
    unitA: asMeasurementUnitId(randomUUID()),
    unitB: asMeasurementUnitId(randomUUID()),
    categoryA: asProductCategoryId(randomUUID()),
    products: [asProductId(randomUUID()), asProductId(randomUUID())],
  };
}
