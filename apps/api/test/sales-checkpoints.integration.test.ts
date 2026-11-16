/**
 * Sales checkpoint routes, end to end on SQLite.
 *
 * The real server runs auth, permissions, validation, price snapshot lookup,
 * confirmation, the stock ledger and persistence.
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
const UNPRICED_PRODUCT_ID = DEVELOPMENT_PRODUCTS[1]!.id;
const PROCESSED_PRODUCT_ID = DEVELOPMENT_PRODUCTS[18]!.id;
const PRESENTATION_ID = DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.id;
const BRANCH_ID = DEVELOPMENT_BRANCHES[0]!.id;
const OTHER_BRANCH_ID = DEVELOPMENT_BRANCHES[1]!.id;
const STAFF_ID = DEVELOPMENT_USERS[2]!.id;
const MANAGER_ID = DEVELOPMENT_USERS[1]!.id;
const OPENING_STOCK_AT = new Date('2026-10-01T09:00:00.000Z');

describe('sales checkpoint routes (SQLite)', () => {
  let dir: string;
  let databaseUrl: string;
  let app: InventoryApiServer;
  let inspection: ReturnType<typeof createSqliteConnection>;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-sales-api-'));
    databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    inspection = createSqliteConnection(databaseUrl);

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4007',
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

  function checkpointPayload(overrides: Record<string, unknown> = {}) {
    return {
      branchId: BRANCH_ID,
      businessDate: '2026-10-05',
      period: 'MORNING',
      note: 'Morning sales',
      items: [
        { productId: RAW_PRODUCT_ID, quantityMilli: 2_500 },
        {
          productId: PROCESSED_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 2,
        },
      ],
      ...overrides,
    };
  }

  async function createDraft(token: string, overrides: Record<string, unknown> = {}) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/sales-checkpoints',
      headers: auth(token),
      payload: checkpointPayload(overrides),
    });
  }

  it('creates a draft with price and weight snapshots, then confirms it into stock', async () => {
    const token = await tokenFor('staff@inventory.test');

    const created = await createDraft(token);
    expect(created.statusCode).toBe(201);
    const checkpoint = created.json();
    expect(checkpoint).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: '2026-10-05',
      period: 'MORNING',
      registeredByUserId: STAFF_ID,
      status: 'DRAFT',
      note: 'Morning sales',
    });
    expect(checkpoint.items).toHaveLength(2);
    expect(checkpoint.items[0]).toMatchObject({
      productId: RAW_PRODUCT_ID,
      productKind: 'RAW',
      unitId: UNIT_KILOGRAM_ID,
      quantityMilli: 2_500,
      weightBasis: 'NOT_APPLICABLE',
      sellingPriceAmountMinor: 300,
      sellingPriceBasis: 'PER_SALES_UNIT',
      sellingPriceCurrency: 'USD',
      estimatedSalesValueMinor: 750,
      position: 1,
      createdAt: expect.any(String),
    });
    expect(checkpoint.items[1]).toMatchObject({
      productId: PROCESSED_PRODUCT_ID,
      productKind: 'PROCESSED',
      unitId: UNIT_KILOGRAM_ID,
      presentationId: PRESENTATION_ID,
      trayCount: 2,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 1_000,
      quantityMilli: 1_000,
      weightBasis: 'ESTIMATED',
      sellingPriceAmountMinor: 500,
      sellingPriceBasis: 'PER_KILOGRAM',
      sellingPriceCurrency: 'USD',
      estimatedSalesValueMinor: 500,
      position: 2,
    });
    expect(checkpoint.confirmedAt).toBeUndefined();

    await expect(movementsFor(checkpoint.id)).resolves.toHaveLength(0);
    await expect(balanceFor(RAW_PRODUCT_ID)).resolves.toBe(10_000);
    await expect(balanceFor(PROCESSED_PRODUCT_ID)).resolves.toBe(5_000);

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/confirm`,
      headers: auth(token),
    });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({
      id: checkpoint.id,
      status: 'CONFIRMED',
      confirmedByUserId: STAFF_ID,
      confirmedAt: expect.any(String),
    });

    const movements = await movementsFor(checkpoint.id);
    expect(movements).toHaveLength(2);
    expect(movements.every((movement) => movement.reason === 'SALES_CHECKPOINT')).toBe(true);
    expect(movements.every((movement) => movement.sourceType === 'SALES_CHECKPOINT')).toBe(true);
    expect(
      movements
        .map((movement) => [movement.productId, movement.quantityDeltaMilli])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
    ).toEqual(
      [
        [RAW_PRODUCT_ID, -2_500],
        [PROCESSED_PRODUCT_ID, -1_000],
      ].sort(([left], [right]) => String(left).localeCompare(String(right))),
    );
    await expect(balanceFor(RAW_PRODUCT_ID)).resolves.toBe(7_500);
    await expect(balanceFor(PROCESSED_PRODUCT_ID)).resolves.toBe(4_000);

    const secondConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/confirm`,
      headers: auth(token),
    });
    expect(secondConfirm.statusCode).toBe(409);
    expect(secondConfirm.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
    await expect(movementsFor(checkpoint.id)).resolves.toHaveLength(2);
  });

  it('uses the measured processed weight as the sold quantity', async () => {
    const token = await tokenFor('staff@inventory.test');
    const created = await createDraft(token, {
      businessDate: '2026-10-06',
      items: [
        {
          productId: PROCESSED_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 2,
          measuredWeightGrams: 1_100,
        },
      ],
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().items[0]).toMatchObject({
      estimatedWeightGrams: 1_000,
      measuredWeightGrams: 1_100,
      quantityMilli: 1_100,
      weightBasis: 'MEASURED',
      estimatedSalesValueMinor: 550,
    });
  });

  it('refuses a duplicate branch, date and period but allows another period', async () => {
    const token = await tokenFor('staff@inventory.test');
    const first = await createDraft(token, { businessDate: '2026-10-07', period: 'MORNING' });
    expect(first.statusCode).toBe(201);

    const duplicate = await createDraft(token, {
      businessDate: '2026-10-07',
      period: 'MORNING',
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const evening = await createDraft(token, { businessDate: '2026-10-07', period: 'EVENING' });
    expect(evening.statusCode).toBe(201);
  });

  it('corrects a confirmed checkpoint once with an audited reversal', async () => {
    const staffToken = await tokenFor('staff@inventory.test');
    const managerToken = await tokenFor('manager@inventory.test');
    const checkpoint = (
      await createDraft(staffToken, {
        businessDate: '2026-10-08',
        items: [{ productId: RAW_PRODUCT_ID, quantityMilli: 1_000 }],
      })
    ).json();

    const beforeConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/correct`,
      headers: auth(staffToken),
      payload: { reason: 'Weights were wrong' },
    });
    expect(beforeConfirm.statusCode).toBe(409);
    expect(beforeConfirm.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/confirm`,
      headers: auth(staffToken),
    });
    const originals = await movementsFor(checkpoint.id);
    expect(originals).toHaveLength(1);
    await expect(balanceFor(RAW_PRODUCT_ID)).resolves.toBe(6_500);

    const corrected = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: '  Weights were wrong  ' },
    });
    expect(corrected.statusCode).toBe(200);
    expect(corrected.json()).toMatchObject({
      id: checkpoint.id,
      status: 'CORRECTED',
      correctedByUserId: MANAGER_ID,
      correctedAt: expect.any(String),
      correctionReason: 'Weights were wrong',
    });

    const all = await movementsFor(checkpoint.id);
    const reversals = all.filter((movement) => movement.reason === 'CORRECTION');
    expect(reversals).toHaveLength(originals.length);
    expect(new Set(reversals.map((movement) => movement.correctsMovementId))).toEqual(
      new Set(originals.map((movement) => movement.id)),
    );
    expect(reversals.map((movement) => movement.quantityDeltaMilli)).toEqual([1_000]);
    await expect(balanceFor(RAW_PRODUCT_ID)).resolves.toBe(7_500);

    const secondCorrect = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: 'Again' },
    });
    expect(secondCorrect.statusCode).toBe(409);

    const invalidReason = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/correct`,
      headers: auth(managerToken),
      payload: { reason: '   ' },
    });
    expect(invalidReason.statusCode).toBe(422);
  });

  it('refuses to confirm more than the branch has in stock', async () => {
    const token = await tokenFor('staff@inventory.test');
    const checkpoint = (
      await createDraft(token, {
        businessDate: '2026-10-09',
        items: [{ productId: RAW_PRODUCT_ID, quantityMilli: 999_000 }],
      })
    ).json();

    const refused = await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}/confirm`,
      headers: auth(token),
    });
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
    expect(refused.json().error.details.resultingQuantityMilli).toBeLessThan(0);

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/sales-checkpoints/${checkpoint.id}`,
      headers: auth(token),
    });
    expect(fetched.json().status).toBe('DRAFT');
    await expect(movementsFor(checkpoint.id)).resolves.toHaveLength(0);
  });

  it('requires a selling price effective on the business date', async () => {
    const token = await tokenFor('staff@inventory.test');

    const unpriced = await createDraft(token, {
      businessDate: '2026-10-10',
      items: [{ productId: UNPRICED_PRODUCT_ID, quantityMilli: 100 }],
    });
    expect(unpriced.statusCode).toBe(422);
    expect(unpriced.json().error.code).toBe('VALIDATION_ERROR');

    const beforePrice = await createDraft(token, {
      businessDate: '2025-12-31',
      items: [{ productId: RAW_PRODUCT_ID, quantityMilli: 100 }],
    });
    expect(beforePrice.statusCode).toBe(422);
    expect(beforePrice.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('lists and filters checkpoints by branch', async () => {
    const token = await tokenFor('staff@inventory.test');
    const mine = (
      await createDraft(token, { businessDate: '2026-10-11', period: 'MORNING' })
    ).json();
    const other = (
      await createDraft(token, {
        branchId: OTHER_BRANCH_ID,
        businessDate: '2026-10-11',
        period: 'MORNING',
      })
    ).json();

    const all = await app.inject({
      method: 'GET',
      url: '/api/v1/sales-checkpoints',
      headers: auth(token),
    });
    expect(all.statusCode).toBe(200);
    expect(all.json().items.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([mine.id, other.id]),
    );

    const filtered = await app.inject({
      method: 'GET',
      url: `/api/v1/sales-checkpoints?branchId=${BRANCH_ID}`,
      headers: auth(token),
    });
    expect(filtered.statusCode).toBe(200);
    const ids = filtered.json().items.map((item: { id: string }) => item.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(other.id);
  });

  it('discards a draft but refuses to discard a confirmed checkpoint', async () => {
    const token = await tokenFor('staff@inventory.test');
    const draft = (await createDraft(token, { businessDate: '2026-10-12' })).json();

    const discarded = await app.inject({
      method: 'DELETE',
      url: `/api/v1/sales-checkpoints/${draft.id}`,
      headers: auth(token),
    });
    expect(discarded.statusCode).toBe(204);

    const gone = await app.inject({
      method: 'GET',
      url: `/api/v1/sales-checkpoints/${draft.id}`,
      headers: auth(token),
    });
    expect(gone.statusCode).toBe(404);

    const confirmedDraft = (await createDraft(token, { businessDate: '2026-10-13' })).json();
    await app.inject({
      method: 'POST',
      url: `/api/v1/sales-checkpoints/${confirmedDraft.id}/confirm`,
      headers: auth(token),
    });

    const refused = await app.inject({
      method: 'DELETE',
      url: `/api/v1/sales-checkpoints/${confirmedDraft.id}`,
      headers: auth(token),
    });
    expect(refused.statusCode).toBe(409);
    expect(refused.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
  });

  it('rejects invalid references, empty checkpoints and branch isolation', async () => {
    const token = await tokenFor('staff@inventory.test');

    const unknownBranch = await createDraft(token, {
      branchId: randomUUID(),
      businessDate: '2026-10-14',
    });
    expect(unknownBranch.statusCode).toBe(404);
    expect(unknownBranch.json().error.code).toBe('NOT_FOUND');

    const empty = await createDraft(token, { businessDate: '2026-10-14', items: [] });
    expect(empty.statusCode).toBe(422);
    expect(empty.json().error.code).toBe('VALIDATION_ERROR');

    const rawWithTrays = await createDraft(token, {
      businessDate: '2026-10-14',
      items: [
        {
          productId: RAW_PRODUCT_ID,
          presentationId: PRESENTATION_ID,
          trayCount: 1,
        },
      ],
    });
    expect(rawWithTrays.statusCode).toBe(422);

    const processedWithoutPresentation = await createDraft(token, {
      businessDate: '2026-10-14',
      items: [{ productId: PROCESSED_PRODUCT_ID, trayCount: 1 }],
    });
    expect(processedWithoutPresentation.statusCode).toBe(422);

    const unknownProduct = await createDraft(token, {
      businessDate: '2026-10-14',
      items: [{ productId: randomUUID(), quantityMilli: 100 }],
    });
    expect(unknownProduct.statusCode).toBe(404);
  });

  it('returns not found for an unknown checkpoint', async () => {
    const token = await tokenFor('staff@inventory.test');
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sales-checkpoints/${randomUUID()}`,
      headers: auth(token),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  async function movementsFor(checkpointId: string) {
    return inspection.db
      .select()
      .from(schema.stockMovements)
      .where(
        and(
          eq(schema.stockMovements.sourceType, 'SALES_CHECKPOINT'),
          eq(schema.stockMovements.sourceId, checkpointId),
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
    name: 'Inventory Sales Test Organization',
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
    [DEVELOPMENT_PRODUCTS[0]!, DEVELOPMENT_PRODUCTS[1]!, DEVELOPMENT_PRODUCTS[18]!].map(
      (product) => ({
        id: product.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        categoryId: product.categoryId,
        name: product.name,
        kind: product.kind,
        inventoryUnitId: UNIT_KILOGRAM_ID,
        salesUnitId: UNIT_KILOGRAM_ID,
        purchaseUnitId: UNIT_KILOGRAM_ID,
        productionUnitId: UNIT_KILOGRAM_ID,
      }),
    ),
  );

  await db.insert(schema.productPresentations).values({
    id: PRESENTATION_ID,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    productId: PROCESSED_PRODUCT_ID,
    name: DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.name,
    averageWeightGrams: DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.averageWeightGrams,
    isActive: true,
  });

  await db.insert(schema.productPriceHistory).values([
    {
      id: 'c4000000-0000-4000-8000-000000000001',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      productId: RAW_PRODUCT_ID,
      amountMinor: 300,
      currency: 'USD',
      priceBasis: 'PER_SALES_UNIT',
      effectiveFrom: '2026-01-01',
      createdAt: OPENING_STOCK_AT,
    },
    {
      id: 'c4000000-0000-4000-8000-000000000002',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      productId: PROCESSED_PRODUCT_ID,
      amountMinor: 500,
      currency: 'USD',
      priceBasis: 'PER_KILOGRAM',
      effectiveFrom: '2026-01-01',
      createdAt: OPENING_STOCK_AT,
    },
  ]);

  await db.insert(schema.stockMovements).values([
    {
      id: 'c5000000-0000-4000-8000-000000000001',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      productId: RAW_PRODUCT_ID,
      quantityDeltaMilli: 10_000,
      reason: 'ADJUSTMENT',
      sourceType: 'ADJUSTMENT',
      sourceId: 'c6000000-0000-4000-8000-000000000001',
      occurredAt: OPENING_STOCK_AT,
      recordedAt: OPENING_STOCK_AT,
      recordedByUserId: STAFF_ID,
      note: 'Opening stock for sales tests',
    },
    {
      id: 'c5000000-0000-4000-8000-000000000002',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      productId: PROCESSED_PRODUCT_ID,
      quantityDeltaMilli: 5_000,
      reason: 'ADJUSTMENT',
      sourceType: 'ADJUSTMENT',
      sourceId: 'c6000000-0000-4000-8000-000000000002',
      occurredAt: OPENING_STOCK_AT,
      recordedAt: OPENING_STOCK_AT,
      recordedByUserId: STAFF_ID,
      note: 'Opening stock for sales tests',
    },
  ]);
}
