/**
 * Production routes, end to end on SQLite.
 *
 * The real server runs auth, permissions, validation, confirmation, the stock
 * ledger and persistence, so the test covers the same path an operator uses.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '@inventory-u3/database/schema/sqlite';
import {
  DEVELOPMENT_BRANCHES,
  DEVELOPMENT_EMPLOYEES,
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_PRODUCT_CATEGORIES,
  DEVELOPMENT_PRODUCT_PRESENTATIONS,
  DEVELOPMENT_PRODUCTS,
  DEVELOPMENT_USERS,
} from '@inventory-u3/database/development-data';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { ScryptPasswordHasher } from '../src/infrastructure/security/scrypt-password-hasher.js';
import { buildServer, type InventoryApiServer } from '../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const UNIT_KILOGRAM_ID = '55555555-5555-4555-8555-000000000001';
const RAW_PRODUCT_ID = DEVELOPMENT_PRODUCTS[0]!.id;
const PROCESSED_PRODUCT_ID = DEVELOPMENT_PRODUCTS[18]!.id;
const PRESENTATION_ID = DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.id;
const BRANCH_ID = DEVELOPMENT_BRANCHES[0]!.id;
const OTHER_BRANCH_ID = DEVELOPMENT_BRANCHES[1]!.id;
const EMPLOYEE_ID = DEVELOPMENT_EMPLOYEES[0]!.id;
const OTHER_BRANCH_EMPLOYEE_ID = DEVELOPMENT_EMPLOYEES[2]!.id;
const STAFF_ID = DEVELOPMENT_USERS[2]!.id;
const MANAGER_ID = DEVELOPMENT_USERS[1]!.id;
const OPENING_STOCK_AT = new Date('2026-10-01T09:00:00.000Z');

describe('production routes (SQLite)', () => {
  let dir: string;
  let databaseUrl: string;
  let app: InventoryApiServer;
  let inspection: ReturnType<typeof createSqliteConnection>;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-production-api-'));
    databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    inspection = createSqliteConnection(databaseUrl);

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4006',
      LOG_LEVEL: 'silent',
      CORS_ORIGINS: 'http://localhost:5173',
      DATABASE_URL: databaseUrl,
      ORGANIZATION_ID: DEVELOPMENT_ORGANIZATION_ID,
      SESSION_TTL_HOURS: '12',
      AUTH_LOGIN_MAX_ATTEMPTS: '100',
      AUTH_LOGIN_WINDOW_MINUTES: '15',
    });
  });

  afterAll(async () => {
    await app?.close();
    inspection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  async function tokenFor(email: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: DEVELOPMENT_PASSWORD },
    });
    return response.json().token as string;
  }

  function auth(token: string): { authorization: string } {
    return { authorization: `Bearer ${token}` };
  }

  function productionPayload(overrides: Record<string, unknown> = {}) {
    return {
      branchId: BRANCH_ID,
      businessDate: '2026-10-05',
      preparedByEmployeeId: EMPLOYEE_ID,
      note: 'Morning trays',
      inputs: [{ productId: RAW_PRODUCT_ID, quantityMilli: 2_500 }],
      outputs: [
        {
          productId: PROCESSED_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 2,
        },
      ],
      waste: [{ productId: RAW_PRODUCT_ID, quantityMilli: 200, reason: 'Trimming' }],
      ...overrides,
    };
  }

  async function createDraft(token: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/production',
      headers: auth(token),
      payload: productionPayload(overrides),
    });
  }

  it('confirms a draft exactly once and writes the stock ledger', async () => {
    const token = await tokenFor('staff@inventory.test');

    const created = await createDraft(token);
    expect(created.statusCode).toBe(201);
    const batch = created.json();
    expect(batch).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: '2026-10-05',
      preparedByEmployeeId: EMPLOYEE_ID,
      registeredByUserId: STAFF_ID,
      status: 'DRAFT',
      note: 'Morning trays',
    });
    expect(batch.inputs).toHaveLength(1);
    expect(batch.inputs[0]).toMatchObject({
      productId: RAW_PRODUCT_ID,
      unitId: UNIT_KILOGRAM_ID,
      quantityMilli: 2_500,
      position: 1,
    });
    expect(batch.outputs).toHaveLength(1);
    expect(batch.outputs[0]).toMatchObject({
      productId: PROCESSED_PRODUCT_ID,
      presentationId: PRESENTATION_ID,
      trayCount: 2,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 1_000,
      weightBasis: 'ESTIMATED',
      position: 1,
    });
    expect(batch.waste).toHaveLength(1);
    expect(batch.confirmedAt).toBeUndefined();

    await expect(movementsFor(batch.id)).resolves.toHaveLength(0);

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/confirm`,
      headers: auth(token),
    });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({
      id: batch.id,
      status: 'CONFIRMED',
      confirmedByUserId: STAFF_ID,
      confirmedAt: expect.any(String),
    });

    const movements = await movementsFor(batch.id);
    expect(movements).toHaveLength(3);
    expect(movements.every((movement) => movement.reason !== 'CORRECTION')).toBe(true);
    expect(movements.every((movement) => movement.sourceType === 'PRODUCTION_BATCH')).toBe(true);
    expect(
      movements
        .map((movement) => [movement.productId, movement.quantityDeltaMilli])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    ).toEqual(
      [
        [RAW_PRODUCT_ID, -2_500],
        [RAW_PRODUCT_ID, -200],
        [PROCESSED_PRODUCT_ID, 1_000],
      ].sort(([left], [right]) => String(left).localeCompare(String(right))),
    );
    expect(movements.map((movement) => movement.reason).sort()).toEqual([
      'PRODUCTION_INPUT',
      'PRODUCTION_OUTPUT',
      'WASTE',
    ]);
    await expect(balanceFor(RAW_PRODUCT_ID)).resolves.toBe(7_300);
    await expect(balanceFor(PROCESSED_PRODUCT_ID)).resolves.toBe(1_000);

    const secondConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/confirm`,
      headers: auth(token),
    });
    expect(secondConfirm.statusCode).toBe(409);
    expect(secondConfirm.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
    await expect(movementsFor(batch.id)).resolves.toHaveLength(3);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/production/${batch.id}`,
      headers: auth(token),
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(confirmed.json());
  });

  it('lists production batches and filters by branch', async () => {
    const token = await tokenFor('staff@inventory.test');
    const first = (await createDraft(token)).json();
    const second = (
      await createDraft(token, {
        branchId: OTHER_BRANCH_ID,
        preparedByEmployeeId: OTHER_BRANCH_EMPLOYEE_ID,
      })
    ).json();

    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/production',
      headers: auth(token),
    });
    expect(all.statusCode).toBe(200);
    expect(all.json().items.map((batch: { id: string }) => batch.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );

    const filtered = await app.inject({
      method: 'GET',
      url: `/api/v1/production?branchId=${BRANCH_ID}`,
      headers: auth(token),
    });
    expect(filtered.statusCode).toBe(200);
    const ids = filtered.json().items.map((batch: { id: string }) => batch.id);
    expect(ids).toContain(first.id);
    expect(ids).not.toContain(second.id);
  });

  it('uses the measured weight as the stock quantity when provided', async () => {
    const token = await tokenFor('staff@inventory.test');
    const created = await createDraft(token, {
      inputs: [{ productId: RAW_PRODUCT_ID, quantityMilli: 1_000 }],
      outputs: [
        {
          productId: PROCESSED_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 2,
          measuredWeightGrams: 1_100,
        },
      ],
      waste: [],
    });
    expect(created.statusCode).toBe(201);
    const batch = created.json();
    expect(batch.outputs[0]).toMatchObject({
      estimatedWeightGrams: 1_000,
      measuredWeightGrams: 1_100,
      weightBasis: 'MEASURED',
    });

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/confirm`,
      headers: auth(token),
    });
    expect(confirmed.statusCode).toBe(200);
    const output = (await movementsFor(batch.id)).find(
      (movement) => movement.reason === 'PRODUCTION_OUTPUT',
    );
    expect(output?.quantityDeltaMilli).toBe(1_100);
  });

  it('corrects a confirmed batch once with an audited reversal', async () => {
    const staffToken = await tokenFor('staff@inventory.test');
    const managerToken = await tokenFor('manager@inventory.test');
    const batch = (await createDraft(staffToken)).json();

    const beforeConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/correct`,
      headers: auth(staffToken),
      payload: { reason: 'Trays were mislabelled' },
    });
    expect(beforeConfirm.statusCode).toBe(409);
    expect(beforeConfirm.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/confirm`,
      headers: auth(staffToken),
    });
    const originals = await movementsFor(batch.id);

    const corrected = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: '  Trays were mislabelled  ' },
    });
    expect(corrected.statusCode).toBe(200);
    expect(corrected.json()).toMatchObject({
      id: batch.id,
      status: 'CORRECTED',
      correctedByUserId: MANAGER_ID,
      correctedAt: expect.any(String),
      correctionReason: 'Trays were mislabelled',
    });

    const reversals = (await movementsFor(batch.id)).filter(
      (movement) => movement.reason === 'CORRECTION',
    );
    expect(reversals).toHaveLength(originals.length);
    expect(new Set(reversals.map((movement) => movement.correctsMovementId))).toEqual(
      new Set(originals.map((movement) => movement.id)),
    );
    expect(reversals.map((movement) => movement.quantityDeltaMilli).sort((a, b) => a - b)).toEqual(
      originals.map((movement) => -movement.quantityDeltaMilli).sort((a, b) => a - b),
    );

    const secondCorrect = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: 'Again' },
    });
    expect(secondCorrect.statusCode).toBe(409);
    expect(secondCorrect.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const invalidReason = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: '   ' },
    });
    expect(invalidReason.statusCode).toBe(422);
  });

  it('refuses to confirm more than the branch has in stock', async () => {
    const token = await tokenFor('staff@inventory.test');
    const batch = (
      await createDraft(token, {
        inputs: [{ productId: RAW_PRODUCT_ID, quantityMilli: 999_000 }],
        outputs: [],
        waste: [],
      })
    ).json();

    const refused = await app.inject({
      method: 'POST',
      url: `/api/v1/production/${batch.id}/confirm`,
      headers: auth(token),
    });
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/production/${batch.id}`,
      headers: auth(token),
    });
    expect(fetched.json().status).toBe('DRAFT');
    await expect(movementsFor(batch.id)).resolves.toHaveLength(0);
  });

  it('discards a draft but refuses to discard a confirmed batch', async () => {
    const token = await tokenFor('staff@inventory.test');
    const draft = (await createDraft(token)).json();

    const discarded = await app.inject({
      method: 'DELETE',
      url: `/api/v1/production/${draft.id}`,
      headers: auth(token),
    });
    expect(discarded.statusCode).toBe(204);

    const gone = await app.inject({
      method: 'GET',
      url: `/api/v1/production/${draft.id}`,
      headers: auth(token),
    });
    expect(gone.statusCode).toBe(404);

    const confirmedDraft = (await createDraft(token)).json();
    await app.inject({
      method: 'POST',
      url: `/api/v1/production/${confirmedDraft.id}/confirm`,
      headers: auth(token),
    });

    const refused = await app.inject({
      method: 'DELETE',
      url: `/api/v1/production/${confirmedDraft.id}`,
      headers: auth(token),
    });
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
  });

  it('rejects invalid references and line kinds', async () => {
    const token = await tokenFor('staff@inventory.test');

    const unknownBranch = await createDraft(token, { branchId: randomUUID() });
    expect(unknownBranch.statusCode).toBe(404);
    expect(unknownBranch.json().error.code).toBe('NOT_FOUND');

    const preparerFromAnotherBranch = await createDraft(token, {
      preparedByEmployeeId: OTHER_BRANCH_EMPLOYEE_ID,
    });
    expect(preparerFromAnotherBranch.statusCode).toBe(422);
    expect(preparerFromAnotherBranch.json().error.code).toBe('VALIDATION_ERROR');

    const processedAsInput = await createDraft(token, {
      inputs: [{ productId: PROCESSED_PRODUCT_ID, quantityMilli: 100 }],
      outputs: [],
      waste: [],
    });
    expect(processedAsInput.statusCode).toBe(422);

    const rawAsOutput = await createDraft(token, {
      inputs: [],
      outputs: [
        {
          productId: RAW_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 1,
        },
      ],
      waste: [],
    });
    expect(rawAsOutput.statusCode).toBe(422);

    const empty = await createDraft(token, { inputs: [], outputs: [], waste: [] });
    expect(empty.statusCode).toBe(422);
    expect(empty.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found for an unknown production batch', async () => {
    const token = await tokenFor('staff@inventory.test');
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/production/${randomUUID()}`,
      headers: auth(token),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  async function movementsFor(batchId: string) {
    return inspection.db
      .select()
      .from(schema.stockMovements)
      .where(
        and(
          eq(schema.stockMovements.sourceType, 'PRODUCTION_BATCH'),
          eq(schema.stockMovements.sourceId, batchId),
        ),
      );
  }

  async function balanceFor(productId: string): Promise<number> {
    const movements = await inspection.db
      .select()
      .from(schema.stockMovements)
      .where(
        and(
          eq(schema.stockMovements.branchId, BRANCH_ID),
          eq(schema.stockMovements.productId, productId),
        ),
      );
    return movements.reduce((total, movement) => total + movement.quantityDeltaMilli, 0);
  }
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Production Test Organization',
    timezone: 'UTC',
    currency: 'USD',
    isActive: true,
  });

  await db.insert(schema.users).values(
    DEVELOPMENT_USERS.map((user) => ({
      id: user.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      email: user.email,
      passwordHash,
      fullName: user.fullName,
      role: user.role,
      isActive: true,
    })),
  );

  await db.insert(schema.branches).values(
    DEVELOPMENT_BRANCHES.slice(0, 2).map((branch) => ({
      id: branch.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      name: branch.name,
    })),
  );

  await db.insert(schema.employees).values(
    [DEVELOPMENT_EMPLOYEES[0]!, DEVELOPMENT_EMPLOYEES[2]!].map((employee) => ({
      id: employee.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: employee.branchId,
      fullName: employee.fullName,
      isActive: true,
    })),
  );

  await db.insert(schema.measurementUnits).values({
    id: UNIT_KILOGRAM_ID,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    code: 'kg',
    name: 'Kilogramo',
  });

  await db.insert(schema.productCategories).values(
    [DEVELOPMENT_PRODUCT_CATEGORIES[0]!, DEVELOPMENT_PRODUCT_CATEGORIES[2]!].map((category) => ({
      id: category.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      name: category.name,
    })),
  );

  await db.insert(schema.products).values(
    [DEVELOPMENT_PRODUCTS[0]!, DEVELOPMENT_PRODUCTS[18]!].map((product) => ({
      id: product.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      categoryId: product.categoryId,
      name: product.name,
      kind: product.kind,
      inventoryUnitId: UNIT_KILOGRAM_ID,
      salesUnitId: UNIT_KILOGRAM_ID,
      purchaseUnitId: UNIT_KILOGRAM_ID,
      productionUnitId: UNIT_KILOGRAM_ID,
    })),
  );

  await db.insert(schema.productPresentations).values({
    id: PRESENTATION_ID,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    productId: PROCESSED_PRODUCT_ID,
    name: DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.name,
    averageWeightGrams: DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.averageWeightGrams,
    isActive: true,
  });

  await db.insert(schema.stockMovements).values({
    id: 'c1000000-0000-4000-8000-000000000001',
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    branchId: BRANCH_ID,
    productId: RAW_PRODUCT_ID,
    quantityDeltaMilli: 10_000,
    reason: 'ADJUSTMENT',
    sourceType: 'ADJUSTMENT',
    sourceId: 'c2000000-0000-4000-8000-000000000001',
    occurredAt: OPENING_STOCK_AT,
    recordedAt: OPENING_STOCK_AT,
    recordedByUserId: STAFF_ID,
    note: 'Opening stock for production tests',
  });
}
