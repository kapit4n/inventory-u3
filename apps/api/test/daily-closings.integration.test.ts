import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  DEVELOPMENT_SUPPLIERS,
  DEVELOPMENT_USERS,
} from '@inventory-u3/database/development-data';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { ScryptPasswordHasher } from '../src/infrastructure/security/scrypt-password-hasher.js';
import { buildServer, type InventoryApiServer } from '../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const BUSINESS_DATE = '2026-11-16';
const UNIT_KILOGRAM_ID = '55555555-5555-4555-8555-000000000001';
const RAW_PRODUCT_ID = DEVELOPMENT_PRODUCTS[0]!.id;
const PROCESSED_PRODUCT_ID = DEVELOPMENT_PRODUCTS[18]!.id;
const PRESENTATION_ID = DEVELOPMENT_PRODUCT_PRESENTATIONS[0]!.id;
const BRANCH_ID = DEVELOPMENT_BRANCHES[0]!.id;
const OTHER_BRANCH_ID = DEVELOPMENT_BRANCHES[1]!.id;
const SUPPLIER_ID = DEVELOPMENT_SUPPLIERS[0]!.id;
const STAFF_ID = DEVELOPMENT_USERS[2]!.id;
const MANAGER_ID = DEVELOPMENT_USERS[1]!.id;
const EMPLOYEE_ID = '44444444-4444-4444-8444-000000000001';
const LATEST_PURCHASE_ID = 'e1000000-0000-4000-8000-000000000001';
const OLDER_PURCHASE_ID = 'e1000000-0000-4000-8000-000000000002';
const DRAFT_PURCHASE_ID = 'e1000000-0000-4000-8000-000000000003';
const OTHER_BRANCH_PURCHASE_ID = 'e1000000-0000-4000-8000-000000000004';
const CONFIRMED_CHECKPOINT_ID = 'e2000000-0000-4000-8000-000000000001';
const DRAFT_CHECKPOINT_ID = 'e2000000-0000-4000-8000-000000000002';
const CONFIRMED_BATCH_ID = 'e3000000-0000-4000-8000-000000000001';
const DRAFT_BATCH_ID = 'e3000000-0000-4000-8000-000000000002';

describe('daily closing routes (SQLite)', () => {
  let dir: string;
  let databaseUrl: string;
  let app: InventoryApiServer;
  let inspection: ReturnType<typeof createSqliteConnection>;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-daily-closing-api-'));
    databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    inspection = createSqliteConnection(databaseUrl);

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4010',
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

  async function createClosing(token: string, businessDate = BUSINESS_DATE) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/daily-closings',
      headers: auth(token),
      payload: { branchId: BRANCH_ID, businessDate },
    });
  }

  it('snapshots branch activity with latest purchase costing', async () => {
    const token = await tokenFor('staff@inventory.test');

    const response = await createClosing(token);
    expect(response.statusCode).toBe(201);
    const closing = response.json();

    expect(closing).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: BUSINESS_DATE,
      version: 1,
      status: 'DRAFT',
      currency: 'USD',
      purchasesTotalMinor: 700,
      purchaseCount: 1,
      unreceivedPurchaseCount: 1,
      productionBatchCount: 1,
      productionDraftCount: 1,
      productionTrayCount: 2,
      productionEstimatedWeightGrams: 1_000,
      salesCheckpointCount: 1,
      draftSalesCheckpointCount: 1,
      salesTotalMinor: 1_400,
      wasteRecordCount: 1,
      inventoryDifferenceProductCount: 1,
      estimatedRevenueMinor: 1_400,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: 350,
      missingCostProductCount: 1,
      negativeStockProductCount: 0,
      createdByUserId: STAFF_ID,
    });
    expect(closing.items).toHaveLength(2);

    const raw = closing.items.find(
      (item: { productId: string }) => item.productId === RAW_PRODUCT_ID,
    );
    expect(raw).toMatchObject({
      productKind: 'RAW',
      unitId: UNIT_KILOGRAM_ID,
      openingQuantityMilli: 10_000,
      purchasedQuantityMilli: 2_000,
      producedQuantityMilli: 0,
      soldQuantityMilli: 3_000,
      wasteQuantityMilli: 500,
      adjustmentQuantityMilli: 100,
      correctionQuantityMilli: -100,
      reconciliationDifferenceQuantityMilli: -100,
      closingQuantityMilli: 8_500,
      estimatedRevenueMinor: 900,
      unitCostAmountMinor: 350,
      costBasis: 'LATEST_PURCHASE_PRICE',
      estimatedCostOfSalesMinor: 1_050,
    });

    const processed = closing.items.find(
      (item: { productId: string }) => item.productId === PROCESSED_PRODUCT_ID,
    );
    expect(processed).toMatchObject({
      productKind: 'PROCESSED',
      openingQuantityMilli: 5_000,
      purchasedQuantityMilli: 0,
      producedQuantityMilli: 1_000,
      soldQuantityMilli: 1_000,
      closingQuantityMilli: 5_000,
      estimatedRevenueMinor: 500,
      costBasis: 'UNAVAILABLE',
      estimatedCostOfSalesMinor: 0,
    });
    expect(processed.unitCostAmountMinor).toBeUndefined();

    const fetched = await app.inject({
      method: 'GET',
      url: `/api/v1/daily-closings/${closing.id}`,
      headers: auth(token),
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().items).toEqual(closing.items);
  });

  it('builds a consolidated report with latest-purchase costing', async () => {
    const token = await tokenFor('manager@inventory.test');
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/summary?from=2026-11-16&to=2026-11-16&granularity=day',
      headers: auth(token),
    });
    expect(response.statusCode).toBe(200);
    const report = response.json();

    expect(report.range).toEqual({
      from: '2026-11-16',
      to: '2026-11-16',
      granularity: 'day',
      timezone: 'UTC',
    });
    expect(report.currency).toBe('USD');
    expect(report.totals).toMatchObject({
      salesTotalMinor: 1_400,
      purchasesTotalMinor: 1_900,
      estimatedCostMinor: 1_050,
      estimatedGrossProfitMinor: 350,
      missingCostProductCount: 1,
      salesCheckpointCount: 1,
      purchaseCount: 2,
      productionBatchCount: 1,
      productionTrayCount: 2,
      productionEstimatedWeightGrams: 1_000,
      wasteRecordCount: 1,
      inventoryProductCount: 3,
    });
    expect(report.periods).toEqual([
      {
        periodStart: '2026-11-16',
        periodEnd: '2026-11-16',
        salesTotalMinor: 1_400,
        purchasesTotalMinor: 1_900,
        estimatedCostMinor: 1_050,
        estimatedGrossProfitMinor: 350,
        salesCheckpointCount: 1,
        purchaseCount: 2,
        productionBatchCount: 1,
        productionTrayCount: 2,
        productionEstimatedWeightGrams: 1_000,
        wasteRecordCount: 1,
      },
    ]);
    expect(report.salesByBranch).toEqual([
      {
        branchId: BRANCH_ID,
        branchName: DEVELOPMENT_BRANCHES[0]!.name,
        salesTotalMinor: 1_400,
        estimatedCostMinor: 1_050,
        estimatedGrossProfitMinor: 350,
        checkpointCount: 1,
        missingCostProductCount: 1,
      },
    ]);
    expect(report.salesByProduct).toEqual([
      {
        productId: RAW_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[0]!.name,
        productKind: 'RAW',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        quantityMilli: 3_000,
        salesTotalMinor: 900,
        estimatedCostMinor: 1_050,
        estimatedGrossProfitMinor: -150,
        trayCount: 0,
        estimatedWeightGrams: 0,
        measuredWeightGrams: 0,
      },
      {
        productId: PROCESSED_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[18]!.name,
        productKind: 'PROCESSED',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        quantityMilli: 1_000,
        salesTotalMinor: 500,
        estimatedCostMinor: 0,
        estimatedGrossProfitMinor: 500,
        trayCount: 2,
        estimatedWeightGrams: 1_000,
        measuredWeightGrams: 0,
      },
    ]);
    expect(report.purchasesBySupplier).toEqual([
      {
        supplierId: SUPPLIER_ID,
        supplierName: DEVELOPMENT_SUPPLIERS[0]!.name,
        purchaseCount: 2,
        totalMinor: 1_900,
      },
    ]);
    expect(report.productionByProduct).toEqual([
      {
        productId: PROCESSED_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[18]!.name,
        productKind: 'PROCESSED',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        batchCount: 1,
        trayCount: 2,
        estimatedWeightGrams: 1_000,
        measuredWeightGrams: 0,
      },
    ]);
    expect(report.wasteByProduct).toEqual([
      {
        productId: RAW_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[0]!.name,
        productKind: 'RAW',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        source: 'INVENTORY',
        quantityMilli: 500,
        recordCount: 1,
      },
    ]);
    expect(report.inventoryByProduct).toEqual([
      {
        branchId: BRANCH_ID,
        branchName: DEVELOPMENT_BRANCHES[0]!.name,
        productId: PROCESSED_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[18]!.name,
        productKind: 'PROCESSED',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        quantityMilli: 5_000,
      },
      {
        branchId: BRANCH_ID,
        branchName: DEVELOPMENT_BRANCHES[0]!.name,
        productId: RAW_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[0]!.name,
        productKind: 'RAW',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        quantityMilli: 8_500,
      },
      {
        branchId: OTHER_BRANCH_ID,
        branchName: DEVELOPMENT_BRANCHES[1]!.name,
        productId: RAW_PRODUCT_ID,
        productName: DEVELOPMENT_PRODUCTS[0]!.name,
        productKind: 'RAW',
        unitId: UNIT_KILOGRAM_ID,
        unitCode: 'kg',
        unitName: 'Kilogramo',
        quantityMilli: 5_000,
      },
    ]);
  });

  it('filters the report by branch and requires the reports permission', async () => {
    const managerToken = await tokenFor('manager@inventory.test');
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/reports/summary?from=2026-11-16&to=2026-11-16&branchId=${OTHER_BRANCH_ID}`,
      headers: auth(managerToken),
    });
    expect(response.statusCode).toBe(200);
    const report = response.json();
    expect(report.range.branchId).toBe(OTHER_BRANCH_ID);
    expect(report.totals).toMatchObject({
      salesTotalMinor: 0,
      purchasesTotalMinor: 1_200,
      estimatedCostMinor: 0,
      missingCostProductCount: 0,
      salesCheckpointCount: 0,
      purchaseCount: 1,
      productionBatchCount: 0,
      wasteRecordCount: 0,
      inventoryProductCount: 1,
    });

    const staffToken = await tokenFor('staff@inventory.test');
    const forbidden = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/summary?from=2026-11-16&to=2026-11-16',
      headers: auth(staffToken),
    });
    expect(forbidden.statusCode).toBe(403);
  });

  it('refuses a second current closing for the same branch and date', async () => {
    const token = await tokenFor('staff@inventory.test');
    const duplicate = await createClosing(token);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
  });

  it('reviews, confirms and reopens into a new immutable version', async () => {
    const staffToken = await tokenFor('staff@inventory.test');
    const managerToken = await tokenFor('manager@inventory.test');
    const closing = (await createClosing(staffToken, '2026-11-15')).json();
    expect(closing.status).toBe('DRAFT');

    const reviewed = await app.inject({
      method: 'POST',
      url: `/api/v1/daily-closings/${closing.id}/review`,
      headers: auth(staffToken),
    });
    expect(reviewed.statusCode).toBe(200);
    expect(reviewed.json()).toMatchObject({
      status: 'REVIEWED',
      reviewedByUserId: STAFF_ID,
      reviewedAt: expect.any(String),
    });

    const secondReview = await app.inject({
      method: 'POST',
      url: `/api/v1/daily-closings/${closing.id}/review`,
      headers: auth(staffToken),
    });
    expect(secondReview.statusCode).toBe(409);
    expect(secondReview.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const confirmed = await app.inject({
      method: 'POST',
      url: `/api/v1/daily-closings/${closing.id}/confirm`,
      headers: auth(staffToken),
    });
    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json()).toMatchObject({
      id: closing.id,
      status: 'CONFIRMED',
      confirmedByUserId: STAFF_ID,
      confirmedAt: expect.any(String),
    });

    const emptyReason = await app.inject({
      method: 'POST',
      url: `/api/v1/daily-closings/${closing.id}/reopen`,
      headers: auth(managerToken),
      payload: { reason: '   ' },
    });
    expect(emptyReason.statusCode).toBe(422);

    const reopened = await app.inject({
      method: 'POST',
      url: `/api/v1/daily-closings/${closing.id}/reopen`,
      headers: auth(managerToken),
      payload: { reason: '  Evening sales arrived late  ' },
    });
    expect(reopened.statusCode).toBe(200);
    const next = reopened.json();
    expect(next).toMatchObject({
      branchId: BRANCH_ID,
      businessDate: '2026-11-15',
      version: 2,
      previousClosingId: closing.id,
      status: 'DRAFT',
      createdByUserId: MANAGER_ID,
    });
    expect(next.id).not.toBe(closing.id);

    const original = await app.inject({
      method: 'GET',
      url: `/api/v1/daily-closings/${closing.id}`,
      headers: auth(staffToken),
    });
    expect(original.json()).toMatchObject({
      status: 'REOPENED',
      reopenedByUserId: MANAGER_ID,
      reopenReason: 'Evening sales arrived late',
      confirmedByUserId: STAFF_ID,
    });

    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/daily-closings?branchId=${BRANCH_ID}&businessDate=2026-11-15`,
      headers: auth(staffToken),
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().items).toHaveLength(1);
    expect(list.json().items[0].id).toBe(next.id);

    const reReview = await app.inject({
      method: 'POST',
      url: `/api/v1/daily-closings/${next.id}/review`,
      headers: auth(staffToken),
    });
    expect(reReview.statusCode).toBe(200);
    expect(reReview.json().status).toBe('REVIEWED');
  });

  it('allows an empty day and validates its inputs', async () => {
    const token = await tokenFor('staff@inventory.test');
    const empty = await createClosing(token, '2026-11-01');
    expect(empty.statusCode).toBe(201);
    expect(empty.json()).toMatchObject({
      purchasesTotalMinor: 0,
      salesTotalMinor: 0,
      estimatedRevenueMinor: 0,
      estimatedCostMinor: 0,
      missingCostProductCount: 0,
      items: [],
    });

    const unknownBranch = await app.inject({
      method: 'POST',
      url: '/api/v1/daily-closings',
      headers: auth(token),
      payload: { branchId: randomUUID(), businessDate: '2026-11-01' },
    });
    expect(unknownBranch.statusCode).toBe(404);

    const invalidDate = await app.inject({
      method: 'POST',
      url: '/api/v1/daily-closings',
      headers: auth(token),
      payload: { branchId: BRANCH_ID, businessDate: '16/11/2026' },
    });
    expect(invalidDate.statusCode).toBe(422);
    expect(invalidDate.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('returns not found for an unknown closing', async () => {
    const token = await tokenFor('staff@inventory.test');
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/daily-closings/${randomUUID()}`,
      headers: auth(token),
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('keeps branch snapshots isolated', async () => {
    const token = await tokenFor('staff@inventory.test');
    const other = (
      await app.inject({
        method: 'POST',
        url: '/api/v1/daily-closings',
        headers: auth(token),
        payload: { branchId: OTHER_BRANCH_ID, businessDate: BUSINESS_DATE },
      })
    ).json();

    expect(other).toMatchObject({
      branchId: OTHER_BRANCH_ID,
      purchasesTotalMinor: 1_200,
      purchaseCount: 1,
      salesTotalMinor: 0,
      estimatedCostMinor: 0,
    });
    const raw = other.items.find(
      (item: { productId: string }) => item.productId === RAW_PRODUCT_ID,
    );
    expect(raw).toMatchObject({
      openingQuantityMilli: 4_000,
      closingQuantityMilli: 5_000,
      costBasis: 'UNAVAILABLE',
    });
  });

  async function closingRows() {
    return inspection.db
      .select()
      .from(schema.dailyClosings)
      .where(
        and(
          eq(schema.dailyClosings.organizationId, DEVELOPMENT_ORGANIZATION_ID),
          eq(schema.dailyClosings.branchId, BRANCH_ID),
        ),
      );
  }

  it('persists every version in the versioned closing table', async () => {
    const rows = await closingRows();
    expect(rows.map((row) => [row.businessDate, row.version, row.status])).toEqual(
      expect.arrayContaining([
        [BUSINESS_DATE, 1, 'DRAFT'],
        ['2026-11-15', 1, 'REOPENED'],
        ['2026-11-15', 2, 'REVIEWED'],
        ['2026-11-01', 1, 'DRAFT'],
      ]),
    );
  });
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Daily Closing Test Organization',
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
    id: SUPPLIER_ID,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    name: DEVELOPMENT_SUPPLIERS[0]!.name,
    isActive: true,
  });

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

  await db.insert(schema.employees).values({
    id: EMPLOYEE_ID,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    branchId: BRANCH_ID,
    fullName: 'Lucía Fernández',
    isActive: true,
  });

  await db
    .insert(schema.purchases)
    .values([
      purchase(
        LATEST_PURCHASE_ID,
        BRANCH_ID,
        'RECEIVED',
        BUSINESS_DATE,
        700,
        '2026-11-16T09:00:00.000Z',
      ),
      purchase(
        OLDER_PURCHASE_ID,
        BRANCH_ID,
        'RECEIVED',
        '2026-11-14',
        300,
        '2026-11-14T09:00:00.000Z',
      ),
      purchase(DRAFT_PURCHASE_ID, BRANCH_ID, 'DRAFT', BUSINESS_DATE, 650, undefined),
      purchase(
        OTHER_BRANCH_PURCHASE_ID,
        OTHER_BRANCH_ID,
        'RECEIVED',
        BUSINESS_DATE,
        1_200,
        '2026-11-16T10:00:00.000Z',
      ),
    ]);

  await db
    .insert(schema.purchaseItems)
    .values([
      purchaseItem(LATEST_PURCHASE_ID, RAW_PRODUCT_ID, 2_000, 350),
      purchaseItem(OLDER_PURCHASE_ID, RAW_PRODUCT_ID, 1_000, 300),
      purchaseItem(DRAFT_PURCHASE_ID, RAW_PRODUCT_ID, 1_000, 650),
      purchaseItem(OTHER_BRANCH_PURCHASE_ID, RAW_PRODUCT_ID, 500, 2_400),
    ]);

  await db
    .insert(schema.stockMovements)
    .values([
      movement(
        'e4000000-0000-4000-8000-000000000001',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        10_000,
        'ADJUSTMENT',
        '2026-11-15T10:00:00.000Z',
      ),
      movement(
        'e4000000-0000-4000-8000-000000000002',
        BRANCH_ID,
        PROCESSED_PRODUCT_ID,
        5_000,
        'ADJUSTMENT',
        '2026-11-15T10:00:00.000Z',
      ),
      movement(
        'e4000000-0000-4000-8000-000000000003',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        2_000,
        'RECEIVING',
        '2026-11-16T09:00:00.000Z',
        'PURCHASE_RECEIPT',
        LATEST_PURCHASE_ID,
      ),
      movement(
        'e4000000-0000-4000-8000-000000000004',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        -3_000,
        'SALES_CHECKPOINT',
        '2026-11-16T13:00:00.000Z',
        'SALES_CHECKPOINT',
        CONFIRMED_CHECKPOINT_ID,
      ),
      movement(
        'e4000000-0000-4000-8000-000000000005',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        -500,
        'WASTE',
        '2026-11-16T14:00:00.000Z',
        'WASTE_REPORT',
        'e6000000-0000-4000-8000-000000000001',
      ),
      movement(
        'e4000000-0000-4000-8000-000000000006',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        200,
        'ADJUSTMENT',
        '2026-11-16T10:00:00.000Z',
        'ADJUSTMENT',
        'e5000000-0000-4000-8000-000000000002',
      ),
      movement(
        'e4000000-0000-4000-8000-000000000007',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        -100,
        'ADJUSTMENT',
        '2026-11-16T11:00:00.000Z',
        'ADJUSTMENT',
        'e5000000-0000-4000-8000-000000000003',
      ),
      movement(
        'e4000000-0000-4000-8000-000000000008',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        -100,
        'CORRECTION',
        '2026-11-16T12:00:00.000Z',
        'SALES_CHECKPOINT',
        CONFIRMED_CHECKPOINT_ID,
      ),
      movement(
        'e4000000-0000-4000-8000-000000000009',
        BRANCH_ID,
        PROCESSED_PRODUCT_ID,
        1_000,
        'PRODUCTION_OUTPUT',
        '2026-11-16T08:00:00.000Z',
        'PRODUCTION_BATCH',
        CONFIRMED_BATCH_ID,
      ),
      movement(
        'e4000000-0000-4000-8000-000000000010',
        BRANCH_ID,
        PROCESSED_PRODUCT_ID,
        -1_000,
        'SALES_CHECKPOINT',
        '2026-11-16T15:00:00.000Z',
        'SALES_CHECKPOINT',
        CONFIRMED_CHECKPOINT_ID,
      ),
      movement(
        'e4000000-0000-4000-8000-000000000011',
        BRANCH_ID,
        RAW_PRODUCT_ID,
        999,
        'RECEIVING',
        '2026-11-17T01:00:00.000Z',
        'PURCHASE_RECEIPT',
        LATEST_PURCHASE_ID,
      ),
      movement(
        'e4000000-0000-4000-8000-000000000012',
        OTHER_BRANCH_ID,
        RAW_PRODUCT_ID,
        4_000,
        'ADJUSTMENT',
        '2026-11-15T10:00:00.000Z',
      ),
      movement(
        'e4000000-0000-4000-8000-000000000013',
        OTHER_BRANCH_ID,
        RAW_PRODUCT_ID,
        1_000,
        'RECEIVING',
        '2026-11-16T10:00:00.000Z',
        'PURCHASE_RECEIPT',
        OTHER_BRANCH_PURCHASE_ID,
      ),
    ]);

  await db.insert(schema.stockAdjustments).values([
    {
      id: 'e5000000-0000-4000-8000-000000000002',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      productId: RAW_PRODUCT_ID,
      kind: 'MANUAL',
      quantityDeltaMilli: 200,
      reason: 'Count adjustment',
      occurredAt: new Date('2026-11-16T10:00:00.000Z'),
      recordedAt: new Date('2026-11-16T10:00:00.000Z'),
      recordedByUserId: STAFF_ID,
    },
    {
      id: 'e5000000-0000-4000-8000-000000000003',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      productId: RAW_PRODUCT_ID,
      kind: 'RECONCILIATION',
      quantityDeltaMilli: -100,
      reason: 'Cycle count',
      expectedQuantityMilli: 9_600,
      countedQuantityMilli: 9_500,
      occurredAt: new Date('2026-11-16T11:00:00.000Z'),
      recordedAt: new Date('2026-11-16T11:00:00.000Z'),
      recordedByUserId: STAFF_ID,
    },
  ]);

  await db.insert(schema.inventoryWaste).values({
    id: 'e6000000-0000-4000-8000-000000000001',
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    branchId: BRANCH_ID,
    productId: RAW_PRODUCT_ID,
    quantityMilli: 500,
    reason: 'Spoiled stock',
    occurredAt: new Date('2026-11-16T14:00:00.000Z'),
    recordedAt: new Date('2026-11-16T14:00:00.000Z'),
    recordedByUserId: STAFF_ID,
  });

  await db.insert(schema.salesCheckpoints).values([
    {
      id: CONFIRMED_CHECKPOINT_ID,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: BUSINESS_DATE,
      period: 'MORNING',
      status: 'CONFIRMED',
      registeredByUserId: STAFF_ID,
      confirmedByUserId: STAFF_ID,
      confirmedAt: new Date('2026-11-16T12:00:00.000Z'),
      createdAt: new Date('2026-11-16T08:00:00.000Z'),
      updatedAt: new Date('2026-11-16T12:00:00.000Z'),
    },
    {
      id: DRAFT_CHECKPOINT_ID,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: BUSINESS_DATE,
      period: 'EVENING',
      status: 'DRAFT',
      registeredByUserId: STAFF_ID,
      createdAt: new Date('2026-11-16T16:00:00.000Z'),
      updatedAt: new Date('2026-11-16T16:00:00.000Z'),
    },
  ]);

  await db.insert(schema.salesCheckpointItems).values([
    {
      id: 'e7000000-0000-4000-8000-000000000001',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      checkpointId: CONFIRMED_CHECKPOINT_ID,
      productId: RAW_PRODUCT_ID,
      productKind: 'RAW',
      unitId: UNIT_KILOGRAM_ID,
      quantityMilli: 3_000,
      weightBasis: 'NOT_APPLICABLE',
      sellingPriceAmountMinor: 300,
      sellingPriceBasis: 'PER_SALES_UNIT',
      sellingPriceCurrency: 'USD',
      estimatedSalesValueMinor: 900,
      position: 1,
      createdAt: new Date('2026-11-16T08:00:00.000Z'),
    },
    {
      id: 'e7000000-0000-4000-8000-000000000002',
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      checkpointId: CONFIRMED_CHECKPOINT_ID,
      productId: PROCESSED_PRODUCT_ID,
      productKind: 'PROCESSED',
      unitId: UNIT_KILOGRAM_ID,
      quantityMilli: 1_000,
      presentationId: PRESENTATION_ID,
      trayCount: 2,
      averageWeightPerTrayGrams: 500,
      estimatedWeightGrams: 1_000,
      weightBasis: 'ESTIMATED',
      sellingPriceAmountMinor: 500,
      sellingPriceBasis: 'PER_KILOGRAM',
      sellingPriceCurrency: 'USD',
      estimatedSalesValueMinor: 500,
      position: 2,
      createdAt: new Date('2026-11-16T08:00:00.000Z'),
    },
  ]);

  await db.insert(schema.productionBatches).values([
    {
      id: CONFIRMED_BATCH_ID,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: BUSINESS_DATE,
      preparedByEmployeeId: EMPLOYEE_ID,
      registeredByUserId: STAFF_ID,
      status: 'CONFIRMED',
      confirmedByUserId: STAFF_ID,
      confirmedAt: new Date('2026-11-16T08:00:00.000Z'),
      createdAt: new Date('2026-11-16T07:00:00.000Z'),
      updatedAt: new Date('2026-11-16T08:00:00.000Z'),
    },
    {
      id: DRAFT_BATCH_ID,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId: BRANCH_ID,
      businessDate: BUSINESS_DATE,
      preparedByEmployeeId: EMPLOYEE_ID,
      registeredByUserId: STAFF_ID,
      status: 'DRAFT',
      createdAt: new Date('2026-11-16T16:30:00.000Z'),
      updatedAt: new Date('2026-11-16T16:30:00.000Z'),
    },
  ]);

  await db.insert(schema.productionOutputs).values({
    id: 'e8000000-0000-4000-8000-000000000001',
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    batchId: CONFIRMED_BATCH_ID,
    productId: PROCESSED_PRODUCT_ID,
    presentationId: PRESENTATION_ID,
    trayCount: 2,
    averageWeightPerTrayGrams: 500,
    estimatedWeightGrams: 1_000,
    weightBasis: 'ESTIMATED',
    position: 1,
    createdAt: new Date('2026-11-16T08:00:00.000Z'),
  });
}

function purchase(
  id: string,
  branchId: string,
  status: 'DRAFT' | 'RECEIVED',
  deliveryDate: string,
  totalMinor: number,
  receivedAt: string | undefined,
): typeof schema.purchases.$inferInsert {
  const at = new Date(receivedAt ?? `${deliveryDate}T08:00:00.000Z`);
  return {
    id,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    branchId,
    supplierId: SUPPLIER_ID,
    status,
    deliveryDate,
    currency: 'USD',
    totalMinor,
    createdByUserId: STAFF_ID,
    ...(receivedAt === undefined
      ? {}
      : { receivedByUserId: STAFF_ID, receivedAt: new Date(receivedAt) }),
    createdAt: at,
    updatedAt: at,
  };
}

function purchaseItem(
  purchaseId: string,
  productId: string,
  quantityMilli: number,
  unitPriceMinor: number,
): typeof schema.purchaseItems.$inferInsert {
  return {
    id: randomUUID(),
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    purchaseId,
    productId,
    unitId: UNIT_KILOGRAM_ID,
    quantityMilli,
    unitPriceMinor,
    lineTotalMinor: Math.floor((quantityMilli * unitPriceMinor) / 1000),
    position: 1,
    createdAt: new Date('2026-11-16T09:00:00.000Z'),
  };
}

function movement(
  id: string,
  branchId: string,
  productId: string,
  quantityDeltaMilli: number,
  reason:
    'ADJUSTMENT' | 'RECEIVING' | 'SALES_CHECKPOINT' | 'WASTE' | 'CORRECTION' | 'PRODUCTION_OUTPUT',
  occurredAt: string,
  sourceType?:
    'ADJUSTMENT' | 'PURCHASE_RECEIPT' | 'SALES_CHECKPOINT' | 'WASTE_REPORT' | 'PRODUCTION_BATCH',
  sourceId?: string,
): typeof schema.stockMovements.$inferInsert {
  const at = new Date(occurredAt);
  return {
    id,
    organizationId: DEVELOPMENT_ORGANIZATION_ID,
    branchId,
    productId,
    quantityDeltaMilli,
    reason,
    sourceType: sourceType ?? null,
    sourceId: sourceId ?? null,
    occurredAt: at,
    recordedAt: at,
    recordedByUserId: STAFF_ID,
  };
}
