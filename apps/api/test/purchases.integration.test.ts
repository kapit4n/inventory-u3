/**
 * Purchase routes, end to end on SQLite.
 *
 * The real server is built so auth, permissions, validation, receiving and
 * persistence run exactly as they do in the process.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '@inventory-u3/database/schema/sqlite';
import {
  DEVELOPMENT_BRANCHES,
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_PRODUCT_CATEGORIES,
  DEVELOPMENT_PRODUCTS,
  DEVELOPMENT_SUPPLIERS,
  DEVELOPMENT_USERS,
} from '@inventory-u3/database/development-data';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { ScryptPasswordHasher } from '../src/infrastructure/security/scrypt-password-hasher.js';
import { buildServer, type InventoryApiServer } from '../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const UNIT_KILOGRAM_ID = '55555555-5555-4555-8555-000000000001';
const ITEM_TWO_PRODUCT_ID = DEVELOPMENT_PRODUCTS[0]!.id;
const ITEM_ONE_PRODUCT_ID = DEVELOPMENT_PRODUCTS[1]!.id;
const STAFF_ID = DEVELOPMENT_USERS[2]!.id;
const MANAGER_ID = DEVELOPMENT_USERS[1]!.id;

describe('purchase routes (SQLite)', () => {
  let dir: string;
  let databaseUrl: string;
  let app: InventoryApiServer;
  let inspection: ReturnType<typeof createSqliteConnection>;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-purchases-api-'));
    databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    inspection = createSqliteConnection(databaseUrl);

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4005',
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

  function purchasePayload(overrides: Record<string, unknown> = {}) {
    return {
      branchId: DEVELOPMENT_BRANCHES[0]!.id,
      supplierId: DEVELOPMENT_SUPPLIERS[0]!.id,
      deliveryDate: '2026-11-13',
      note: 'Morning delivery',
      items: [
        {
          productId: ITEM_ONE_PRODUCT_ID,
          unitId: UNIT_KILOGRAM_ID,
          quantityMilli: 12_500,
          unitPriceMinor: 350,
        },
        {
          productId: ITEM_TWO_PRODUCT_ID,
          unitId: UNIT_KILOGRAM_ID,
          quantityMilli: 1_500,
          unitPriceMinor: 333,
        },
      ],
      ...overrides,
    };
  }

  async function createDraft(token: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/purchases',
      headers: auth(token),
      payload: purchasePayload(overrides),
    });
  }

  it('creates a draft purchase without stock and receives it exactly once', async () => {
    const token = await tokenFor('staff@inventory.test');

    const created = await createDraft(token);
    expect(created.statusCode).toBe(201);
    const purchase = created.json();
    expect(purchase).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: DEVELOPMENT_BRANCHES[0]!.id,
      supplierId: DEVELOPMENT_SUPPLIERS[0]!.id,
      status: 'DRAFT',
      deliveryDate: '2026-11-13',
      currency: 'USD',
      totalMinor: 4_875,
      note: 'Morning delivery',
      createdByUserId: STAFF_ID,
    });
    expect(purchase.items).toHaveLength(2);
    expect(purchase.items.map((item: { position: number }) => item.position)).toEqual([1, 2]);
    expect(purchase.receivedAt).toBeUndefined();

    await expect(stockMovementsFor(purchase.id)).resolves.toHaveLength(0);

    const received = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/receive`,
      headers: auth(token),
    });
    expect(received.statusCode).toBe(200);
    expect(received.json()).toMatchObject({
      id: purchase.id,
      status: 'RECEIVED',
      receivedByUserId: STAFF_ID,
      receivedAt: expect.any(String),
    });

    const movements = await stockMovementsFor(purchase.id);
    expect(movements).toHaveLength(2);
    expect(movements.map((movement) => movement.quantityDelta).sort((a, b) => a - b)).toEqual([
      1.5, 12.5,
    ]);
    expect(movements.every((movement) => movement.reason === 'RECEIVING')).toBe(true);
    expect(movements.every((movement) => movement.sourceType === 'PURCHASE_RECEIPT')).toBe(true);

    const secondReceive = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/receive`,
      headers: auth(token),
    });
    expect(secondReceive.statusCode).toBe(409);
    expect(secondReceive.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
    await expect(stockMovementsFor(purchase.id)).resolves.toHaveLength(2);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/purchases/${purchase.id}`,
      headers: auth(token),
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(received.json());
  });

  it('lists purchases and filters by branch', async () => {
    const token = await tokenFor('staff@inventory.test');
    const first = (await createDraft(token)).json();
    const second = (await createDraft(token, { branchId: DEVELOPMENT_BRANCHES[1]!.id })).json();

    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/purchases',
      headers: auth(token),
    });
    expect(all.statusCode).toBe(200);
    expect(all.json().items.map((purchase: { id: string }) => purchase.id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );

    const filtered = await app.inject({
      method: 'GET',
      url: `/api/v1/purchases?branchId=${DEVELOPMENT_BRANCHES[0]!.id}`,
      headers: auth(token),
    });
    expect(filtered.statusCode).toBe(200);
    expect(filtered.json().items.map((purchase: { id: string }) => purchase.id)).toContain(
      first.id,
    );
    expect(filtered.json().items.map((purchase: { id: string }) => purchase.id)).not.toContain(
      second.id,
    );
  });

  it('corrects a received purchase once with an audited reversal', async () => {
    const staffToken = await tokenFor('staff@inventory.test');
    const managerToken = await tokenFor('manager@inventory.test');
    const purchase = (await createDraft(staffToken)).json();

    const beforeReceive = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/correct`,
      headers: auth(staffToken),
      payload: { reason: 'Supplier invoice was wrong' },
    });
    expect(beforeReceive.statusCode).toBe(409);
    expect(beforeReceive.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/receive`,
      headers: auth(staffToken),
    });

    const corrected = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: '  Supplier invoice was wrong  ' },
    });
    expect(corrected.statusCode).toBe(200);
    const result = corrected.json();
    expect(result.purchase).toMatchObject({
      id: purchase.id,
      status: 'CORRECTED',
      correctedByUserId: MANAGER_ID,
      correctedAt: expect.any(String),
    });
    expect(result.correction).toMatchObject({
      purchaseId: purchase.id,
      correctedByUserId: MANAGER_ID,
      reason: 'Supplier invoice was wrong',
      beforeTotalMinor: 4_875,
      afterTotalMinor: 0,
    });

    const originals = await stockMovementsFor(purchase.id);
    expect(originals).toHaveLength(2);
    const reversals = await inspection.db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.sourceId, result.correction.id));
    expect(reversals).toHaveLength(2);
    expect(reversals.every((movement) => movement.reason === 'CORRECTION')).toBe(true);
    expect(reversals.every((movement) => movement.sourceType === 'PURCHASE_CORRECTION')).toBe(true);
    expect(reversals.map((movement) => movement.quantityDelta).sort((a, b) => a - b)).toEqual([
      -12.5, -1.5,
    ]);
    expect(new Set(reversals.map((movement) => movement.correctsMovementId))).toEqual(
      new Set(originals.map((movement) => movement.id)),
    );

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/purchases/${purchase.id}/correction`,
      headers: auth(staffToken),
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toEqual(result.correction);

    const secondCorrect = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: 'Again' },
    });
    expect(secondCorrect.statusCode).toBe(409);
    expect(secondCorrect.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const invalidReason = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${purchase.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: '   ' },
    });
    expect(invalidReason.statusCode).toBe(422);
  });

  it('cancels a draft but refuses to cancel a received purchase', async () => {
    const token = await tokenFor('staff@inventory.test');
    const draft = (await createDraft(token)).json();

    const cancelled = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${draft.id}/cancel`,
      headers: auth(token),
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json()).toMatchObject({
      status: 'CANCELLED',
      cancelledAt: expect.any(String),
    });
    await expect(stockMovementsFor(draft.id)).resolves.toHaveLength(0);

    const receivedDraft = (await createDraft(token)).json();
    await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${receivedDraft.id}/receive`,
      headers: auth(token),
    });

    const refused = await app.inject({
      method: 'POST',
      url: `/api/v1/purchases/${receivedDraft.id}/cancel`,
      headers: auth(token),
    });
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
  });

  it('rejects invalid references and unit conversions', async () => {
    const token = await tokenFor('staff@inventory.test');

    const unknownBranch = await createDraft(token, { branchId: randomUUID() });
    expect(unknownBranch.statusCode).toBe(404);
    expect(unknownBranch.json().error.code).toBe('NOT_FOUND');

    const unknownSupplier = await createDraft(token, { supplierId: randomUUID() });
    expect(unknownSupplier.statusCode).toBe(404);
    expect(unknownSupplier.json().error.code).toBe('NOT_FOUND');

    const unknownProduct = await createDraft(token, {
      items: [
        {
          productId: randomUUID(),
          unitId: UNIT_KILOGRAM_ID,
          quantityMilli: 1_000,
          unitPriceMinor: 100,
        },
      ],
    });
    expect(unknownProduct.statusCode).toBe(404);
    expect(unknownProduct.json().error.code).toBe('NOT_FOUND');

    const wrongUnit = await createDraft(token, {
      items: [
        {
          productId: ITEM_ONE_PRODUCT_ID,
          unitId: '55555555-5555-4555-8555-000000000004',
          quantityMilli: 1_000,
          unitPriceMinor: 100,
        },
      ],
    });
    expect(wrongUnit.statusCode).toBe(422);
    expect(wrongUnit.json().error.code).toBe('VALIDATION_ERROR');

    const empty = await createDraft(token, { items: [] });
    expect(empty.statusCode).toBe(422);
    expect(empty.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found for an unknown purchase', async () => {
    const token = await tokenFor('staff@inventory.test');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/purchases/${randomUUID()}`,
      headers: auth(token),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  async function stockMovementsFor(purchaseId: string) {
    return inspection.db
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.sourceId, purchaseId));
  }
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Purchase Test Organization',
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

  await db.insert(schema.suppliers).values({
    id: DEVELOPMENT_SUPPLIERS[0]!.id,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    name: DEVELOPMENT_SUPPLIERS[0]!.name,
  });

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

  await db.insert(schema.products).values(
    [DEVELOPMENT_PRODUCTS[0]!, DEVELOPMENT_PRODUCTS[1]!].map((product) => ({
      id: product.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      categoryId: product.categoryId,
      name: product.name,
      kind: product.kind,
      inventoryUnitId: UNIT_KILOGRAM_ID,
      salesUnitId: UNIT_KILOGRAM_ID,
      purchaseUnitId: UNIT_KILOGRAM_ID,
    })),
  );
}
