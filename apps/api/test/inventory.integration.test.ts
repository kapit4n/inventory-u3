/**
 * Branch inventory routes, end to end on SQLite.
 *
 * The real server is built so auth, permissions, validation, derived balances
 * and the stock ledger run exactly as they do in the process.
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
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_PRODUCT_CATEGORIES,
  DEVELOPMENT_PRODUCTS,
  DEVELOPMENT_USERS,
} from '@inventory-u3/database/development-data';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { ScryptPasswordHasher } from '../src/infrastructure/security/scrypt-password-hasher.js';
import { buildServer, type InventoryApiServer } from '../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const UNIT_KILOGRAM_ID = '55555555-5555-4555-8555-000000000001';
const INACTIVE_BRANCH_ID = '22222222-2222-4222-8222-000000000099';
const INACTIVE_PRODUCT_ID = '77777777-7777-4777-8777-000000000099';
const PRODUCT_A_ID = DEVELOPMENT_PRODUCTS[0]!.id;
const PRODUCT_B_ID = DEVELOPMENT_PRODUCTS[1]!.id;
const STAFF_ID = DEVELOPMENT_USERS[2]!.id;

describe('inventory routes (SQLite)', () => {
  let dir: string;
  let app: InventoryApiServer;
  let inspection: ReturnType<typeof createSqliteConnection>;
  let token: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-stock-api-'));
    const databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

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

    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'staff@inventory.test', password: DEVELOPMENT_PASSWORD },
    });
    token = login.json().token as string;
  });

  afterAll(async () => {
    await app?.close();
    inspection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function auth(): { authorization: string } {
    return { authorization: `Bearer ${token}` };
  }

  function adjustPayload(overrides: Record<string, unknown> = {}) {
    return {
      branchId: DEVELOPMENT_BRANCHES[0]!.id,
      productId: PRODUCT_A_ID,
      quantityDeltaMilli: 10_000,
      reason: 'Opening stock',
      note: 'Counted by the branch',
      ...overrides,
    };
  }

  it('derives balances from adjustments, waste and reconciliations', async () => {
    const balanceBefore = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory?branchId=${DEVELOPMENT_BRANCHES[0]!.id}`,
      headers: auth(),
    });
    expect(balanceBefore.statusCode).toBe(200);
    expect(balanceBefore.json()).toEqual({ items: [] });

    const adjusted = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/adjustments',
      headers: auth(),
      payload: adjustPayload({ note: '  Counted by the branch  ' }),
    });
    expect(adjusted.statusCode).toBe(201);
    const adjustment = adjusted.json();
    expect(adjustment).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: DEVELOPMENT_BRANCHES[0]!.id,
      productId: PRODUCT_A_ID,
      kind: 'MANUAL',
      quantityDeltaMilli: 10_000,
      reason: 'Opening stock',
      note: 'Counted by the branch',
      recordedByUserId: STAFF_ID,
      occurredAt: expect.any(String),
      recordedAt: expect.any(String),
    });
    expect(adjustment.expectedQuantityMilli).toBeUndefined();
    expect(adjustment.countedQuantityMilli).toBeUndefined();

    await expect(balanceFor(PRODUCT_A_ID)).resolves.toBe(10_000);

    const movementsAfterAdjustment = await movementsFor(PRODUCT_A_ID);
    expect(movementsAfterAdjustment).toHaveLength(1);
    expect(movementsAfterAdjustment[0]).toMatchObject({
      quantityDeltaMilli: 10_000,
      reason: 'ADJUSTMENT',
      source: { type: 'ADJUSTMENT', id: adjustment.id },
      recordedByUserId: STAFF_ID,
    });

    const wasted = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/waste',
      headers: auth(),
      payload: {
        branchId: DEVELOPMENT_BRANCHES[0]!.id,
        productId: PRODUCT_A_ID,
        quantityMilli: 2_000,
        reason: 'Damaged in transit',
      },
    });
    expect(wasted.statusCode).toBe(201);
    expect(wasted.json()).toMatchObject({
      quantityMilli: 2_000,
      reason: 'Damaged in transit',
      recordedByUserId: STAFF_ID,
    });
    await expect(balanceFor(PRODUCT_A_ID)).resolves.toBe(8_000);

    const reconciled = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/reconciliations',
      headers: auth(),
      payload: {
        branchId: DEVELOPMENT_BRANCHES[0]!.id,
        productId: PRODUCT_A_ID,
        countedQuantityMilli: 7_500,
        reason: 'Physical count',
      },
    });
    expect(reconciled.statusCode).toBe(201);
    expect(reconciled.json()).toMatchObject({
      kind: 'RECONCILIATION',
      quantityDeltaMilli: -500,
      expectedQuantityMilli: 8_000,
      countedQuantityMilli: 7_500,
      reason: 'Physical count',
      recordedByUserId: STAFF_ID,
    });
    await expect(balanceFor(PRODUCT_A_ID)).resolves.toBe(7_500);

    const movements = await movementsFor(PRODUCT_A_ID);
    expect(movements.map((movement) => movement.quantityDeltaMilli)).toEqual([
      -500, -2_000, 10_000,
    ]);
    expect(movements.map((movement) => movement.reason)).toEqual([
      'ADJUSTMENT',
      'WASTE',
      'ADJUSTMENT',
    ]);
    expect(movements[1]).toMatchObject({
      source: { type: 'WASTE_REPORT', id: wasted.json().id },
    });

    const zeroDifference = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/reconciliations',
      headers: auth(),
      payload: {
        branchId: DEVELOPMENT_BRANCHES[0]!.id,
        productId: PRODUCT_A_ID,
        countedQuantityMilli: 7_500,
        reason: 'Second count matched',
      },
    });
    expect(zeroDifference.statusCode).toBe(201);
    expect(zeroDifference.json()).toMatchObject({
      kind: 'RECONCILIATION',
      quantityDeltaMilli: 0,
      expectedQuantityMilli: 7_500,
      countedQuantityMilli: 7_500,
    });
    await expect(balanceFor(PRODUCT_A_ID)).resolves.toBe(7_500);
    await expect(movementsFor(PRODUCT_A_ID)).resolves.toHaveLength(3);
  });

  it('refuses operations that would leave negative stock', async () => {
    const before = await adjustmentCount();
    const movementsBefore = await movementsFor(PRODUCT_A_ID);

    const excessiveWaste = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/waste',
      headers: auth(),
      payload: {
        branchId: DEVELOPMENT_BRANCHES[0]!.id,
        productId: PRODUCT_A_ID,
        quantityMilli: 10_000,
        reason: 'Too much waste',
      },
    });
    expect(excessiveWaste.statusCode).toBe(409);
    expect(excessiveWaste.json().error).toMatchObject({
      code: 'DOMAIN_RULE_VIOLATION',
      details: {
        currentQuantityMilli: 7_500,
        deltaQuantityMilli: -10_000,
        resultingQuantityMilli: -2_500,
      },
    });

    const excessiveAdjustment = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/adjustments',
      headers: auth(),
      payload: adjustPayload({ quantityDeltaMilli: -10_000, reason: 'Remove everything' }),
    });
    expect(excessiveAdjustment.statusCode).toBe(409);
    expect(excessiveAdjustment.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    await expect(balanceFor(PRODUCT_A_ID)).resolves.toBe(7_500);
    await expect(adjustmentCount()).resolves.toBe(before);
    await expect(movementsFor(PRODUCT_A_ID)).resolves.toEqual(movementsBefore);
  });

  it('rejects unknown or inactive targets and invalid bodies', async () => {
    const unknownBranch = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory?branchId=${randomUUID()}`,
      headers: auth(),
    });
    expect(unknownBranch.statusCode).toBe(404);
    expect(unknownBranch.json().error.code).toBe('NOT_FOUND');

    const invalidBranch = await app.inject({
      method: 'GET',
      url: '/api/v1/inventory?branchId=not-a-uuid',
      headers: auth(),
    });
    expect(invalidBranch.statusCode).toBe(422);
    expect(invalidBranch.json().error.code).toBe('VALIDATION_ERROR');

    const unknownProduct = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/adjustments',
      headers: auth(),
      payload: adjustPayload({ productId: randomUUID() }),
    });
    expect(unknownProduct.statusCode).toBe(404);
    expect(unknownProduct.json().error.code).toBe('NOT_FOUND');

    const inactiveProduct = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/adjustments',
      headers: auth(),
      payload: adjustPayload({ productId: INACTIVE_PRODUCT_ID }),
    });
    expect(inactiveProduct.statusCode).toBe(409);
    expect(inactiveProduct.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const inactiveBranch = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/adjustments',
      headers: auth(),
      payload: adjustPayload({ branchId: INACTIVE_BRANCH_ID }),
    });
    expect(inactiveBranch.statusCode).toBe(409);
    expect(inactiveBranch.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const zeroAdjustment = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/adjustments',
      headers: auth(),
      payload: adjustPayload({ quantityDeltaMilli: 0 }),
    });
    expect(zeroAdjustment.statusCode).toBe(422);

    const negativeWaste = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/waste',
      headers: auth(),
      payload: {
        branchId: DEVELOPMENT_BRANCHES[0]!.id,
        productId: PRODUCT_A_ID,
        quantityMilli: -1,
        reason: 'Invalid waste',
      },
    });
    expect(negativeWaste.statusCode).toBe(422);

    const negativeCount = await app.inject({
      method: 'POST',
      url: '/api/v1/inventory/reconciliations',
      headers: auth(),
      payload: {
        branchId: DEVELOPMENT_BRANCHES[0]!.id,
        productId: PRODUCT_A_ID,
        countedQuantityMilli: -1,
        reason: 'Invalid count',
      },
    });
    expect(negativeCount.statusCode).toBe(422);

    const unknownMovementBranch = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory/${PRODUCT_A_ID}/movements?branchId=${randomUUID()}`,
      headers: auth(),
    });
    expect(unknownMovementBranch.statusCode).toBe(404);
  });

  it('keeps branches and products isolated', async () => {
    const otherBranch = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory?branchId=${DEVELOPMENT_BRANCHES[1]!.id}`,
      headers: auth(),
    });
    expect(otherBranch.statusCode).toBe(200);
    expect(otherBranch.json()).toEqual({ items: [] });

    await expect(movementsFor(PRODUCT_B_ID)).resolves.toEqual([]);

    const otherProduct = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory/${PRODUCT_B_ID}/movements?branchId=${DEVELOPMENT_BRANCHES[0]!.id}`,
      headers: auth(),
    });
    expect(otherProduct.statusCode).toBe(200);
    expect(otherProduct.json()).toEqual({ items: [] });
  });

  async function balanceFor(productId: string): Promise<number | undefined> {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory?branchId=${DEVELOPMENT_BRANCHES[0]!.id}`,
      headers: auth(),
    });
    const item = response
      .json()
      .items.find((balance: { productId: string }) => balance.productId === productId);
    return item?.quantityOnHandMilli;
  }

  async function movementsFor(productId: string): Promise<Array<Record<string, unknown>>> {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/inventory/${productId}/movements?branchId=${DEVELOPMENT_BRANCHES[0]!.id}`,
      headers: auth(),
    });
    expect(response.statusCode).toBe(200);
    return response.json().items;
  }

  async function adjustmentCount(): Promise<number> {
    const rows = await inspection.db
      .select()
      .from(schema.stockAdjustments)
      .where(
        and(
          eq(schema.stockAdjustments.organizationId, DEVELOPMENT_ORGANIZATION_ID),
          eq(schema.stockAdjustments.branchId, DEVELOPMENT_BRANCHES[0]!.id),
        ),
      );
    return rows.length;
  }
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Route Test Organization',
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

  await db.insert(schema.branches).values([
    ...DEVELOPMENT_BRANCHES.slice(0, 2).map((branch) => ({
      id: branch.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      name: branch.name,
    })),
    {
      id: INACTIVE_BRANCH_ID,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      name: 'Closed Branch',
      isActive: false,
    },
  ]);

  await db.insert(schema.measurementUnits).values({
    id: UNIT_KILOGRAM_ID,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    code: 'kg',
    name: 'Kilogramo',
  });

  await db.insert(schema.productCategories).values({
    id: DEVELOPMENT_PRODUCT_CATEGORIES[0]!.id,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    name: DEVELOPMENT_PRODUCT_CATEGORIES[0]!.name,
  });

  await db.insert(schema.products).values([
    ...[DEVELOPMENT_PRODUCTS[0]!, DEVELOPMENT_PRODUCTS[1]!].map((product) => ({
      id: product.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      categoryId: product.categoryId,
      name: product.name,
      kind: product.kind,
      inventoryUnitId: UNIT_KILOGRAM_ID,
      salesUnitId: UNIT_KILOGRAM_ID,
      purchaseUnitId: UNIT_KILOGRAM_ID,
    })),
    {
      id: INACTIVE_PRODUCT_ID,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      categoryId: DEVELOPMENT_PRODUCT_CATEGORIES[0]!.id,
      name: 'Retired Product',
      kind: 'RAW',
      inventoryUnitId: UNIT_KILOGRAM_ID,
      salesUnitId: UNIT_KILOGRAM_ID,
      purchaseUnitId: UNIT_KILOGRAM_ID,
      isActive: false,
    },
  ]);
}
