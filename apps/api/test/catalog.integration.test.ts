/**
 * Catalogue master-data routes, end to end on SQLite.
 *
 * The real server is built so auth, permissions, validation, uniqueness checks
 * and persistence run exactly as they do in the process.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '@inventory-u3/database/schema/sqlite';
import {
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_USERS,
} from '@inventory-u3/database/development-data';
import { createMeasurementUnit, createProduct, createProductCategory } from '@inventory-u3/domain';
import {
  asMeasurementUnitId,
  asOrganizationId,
  asProductCategoryId,
  asProductId,
} from '@inventory-u3/types';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { SQLiteMeasurementUnitRepository } from '../src/infrastructure/persistence/sqlite/repositories/measurement-unit-repository.js';
import { SQLiteProductCategoryRepository } from '../src/infrastructure/persistence/sqlite/repositories/product-category-repository.js';
import { SQLiteProductRepository } from '../src/infrastructure/persistence/sqlite/repositories/product-repository.js';
import { ScryptPasswordHasher } from '../src/infrastructure/security/scrypt-password-hasher.js';
import { buildServer, type InventoryApiServer } from '../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = '2026-11-09T12:00:00.000Z';

describe('catalog routes (SQLite)', () => {
  let dir: string;
  let app: InventoryApiServer;
  let productId: string;
  let categoryId: string;
  let unitId: string;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-catalog-api-'));
    const databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);

    const measurementUnits = new SQLiteMeasurementUnitRepository(db);
    const productCategories = new SQLiteProductCategoryRepository(db);
    const products = new SQLiteProductRepository(db);
    const organizationId = asOrganizationId(DEVELOPMENT_ORGANIZATION_ID);

    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId,
          code: `kg-${randomUUID().slice(0, 8)}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId,
          name: `Seeded fruit ${randomUUID()}`,
        },
        NOW,
      ),
    );
    const product = await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId,
          categoryId: fruit.id,
          name: `Watermelon ${randomUUID()}`,
          kind: 'PROCESSED',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
          productionUnitId: kilogram.id,
        },
        NOW,
      ),
    );
    productId = product.id;
    categoryId = fruit.id;
    unitId = kilogram.id;
    client.close();

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

  it('lists categories and units for a reader', async () => {
    const token = await tokenFor('staff@inventory.test');

    const categories = await app.inject({
      method: 'GET',
      url: '/api/v1/product-categories',
      headers: auth(token),
    });
    const units = await app.inject({
      method: 'GET',
      url: '/api/v1/measurement-units',
      headers: auth(token),
    });

    expect(categories.statusCode).toBe(200);
    expect(Array.isArray(categories.json().items)).toBe(true);
    expect(units.statusCode).toBe(200);
    expect(Array.isArray(units.json().items)).toBe(true);
  });

  it('does not let a non-administrator create catalogue master data', async () => {
    const token = await tokenFor('manager@inventory.test');

    const category = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: auth(token),
      payload: { name: 'Forbidden Category' },
    });
    const unit = await app.inject({
      method: 'POST',
      url: '/api/v1/measurement-units',
      headers: auth(token),
      payload: { code: 'forbidden', name: 'Forbidden Unit' },
    });
    const product = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: auth(token),
      payload: {
        categoryId,
        name: 'Forbidden Product',
        kind: 'RAW',
        inventoryUnitId: unitId,
        salesUnitId: unitId,
      },
    });

    for (const response of [category, unit, product]) {
      expect(response.statusCode).toBe(403);
      expect(response.json().error.code).toBe('FORBIDDEN');
    }
  });

  it('creates, lists and updates a product category with a unique name', async () => {
    const token = await tokenFor('admin@inventory.test');
    const name = `Fruit ${randomUUID()}`;

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: auth(token),
      payload: { name: `  ${name}  ` },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      name,
      isActive: true,
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/product-categories',
      headers: auth(token),
    });
    expect(listed.json().items).toContainEqual(created.json());

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: auth(token),
      payload: { name },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const category = created.json();
    const renamed = `Fresh fruit ${randomUUID()}`;
    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/product-categories/${category.id}`,
      headers: auth(token),
      payload: { name: renamed, isActive: false },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: category.id,
      name: renamed,
      isActive: false,
      createdAt: category.createdAt,
      updatedAt: expect.any(String),
    });
  });

  it('returns not found for an unknown product category', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/product-categories/${randomUUID()}`,
      headers: auth(token),
      payload: { name: 'Missing Category', isActive: true },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('creates, lists and updates a measurement unit with a unique code', async () => {
    const token = await tokenFor('admin@inventory.test');
    const code = `kg-${randomUUID().slice(0, 8)}`;

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/measurement-units',
      headers: auth(token),
      payload: { code: `  ${code}  `, name: '  Kilogram  ' },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      code,
      name: 'Kilogram',
      isActive: true,
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/measurement-units',
      headers: auth(token),
    });
    expect(listed.json().items).toContainEqual(created.json());

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/measurement-units',
      headers: auth(token),
      payload: { code, name: 'Duplicate Kilogram' },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const unit = created.json();
    const nextCode = `kilos-${randomUUID().slice(0, 8)}`;
    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/measurement-units/${unit.id}`,
      headers: auth(token),
      payload: { code: nextCode, name: 'Kilograms', isActive: false },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: unit.id,
      code: nextCode,
      name: 'Kilograms',
      isActive: false,
      createdAt: unit.createdAt,
      updatedAt: expect.any(String),
    });
  });

  it('returns not found for an unknown measurement unit', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/measurement-units/${randomUUID()}`,
      headers: auth(token),
      payload: { code: 'missing', name: 'Missing Unit', isActive: true },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('lists, creates and updates presentations within a product', async () => {
    const reader = await tokenFor('staff@inventory.test');
    const token = await tokenFor('admin@inventory.test');
    const name = `Covered tray ${randomUUID()}`;

    const before = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${productId}/presentations`,
      headers: auth(reader),
    });
    expect(before.statusCode).toBe(200);
    expect(Array.isArray(before.json().items)).toBe(true);

    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/presentations`,
      headers: auth(token),
      payload: { name: `  ${name}  `, averageWeightGrams: 500 },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      productId,
      name,
      averageWeightGrams: 500,
      isActive: true,
    });

    const duplicate = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/presentations`,
      headers: auth(token),
      payload: { name, averageWeightGrams: 700 },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const presentation = created.json();
    const renamed = `Large tray ${randomUUID()}`;
    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/products/${productId}/presentations/${presentation.id}`,
      headers: auth(token),
      payload: { name: renamed, averageWeightGrams: 750, isActive: false },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: presentation.id,
      productId,
      name: renamed,
      averageWeightGrams: 750,
      isActive: false,
      createdAt: presentation.createdAt,
      updatedAt: expect.any(String),
    });
  });

  it('returns not found for presentations under an unknown product', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${randomUUID()}/presentations`,
      headers: auth(token),
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('returns not found for an unknown product presentation', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/products/${productId}/presentations/${randomUUID()}`,
      headers: auth(token),
      payload: { name: 'Missing Tray', averageWeightGrams: 500, isActive: true },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('records append-only, effective-dated product prices', async () => {
    const admin = await tokenFor('admin@inventory.test');
    const staff = await tokenFor('staff@inventory.test');

    const empty = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${productId}/prices`,
      headers: auth(admin),
    });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual({ items: [], currency: 'USD' });

    const later = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/prices`,
      headers: auth(admin),
      payload: { amountMinor: 450, effectiveFrom: '2026-12-01' },
    });
    expect(later.statusCode).toBe(201);
    expect(later.json()).toMatchObject({
      productId,
      amountMinor: 450,
      currency: 'USD',
      priceBasis: 'PER_KILOGRAM',
      effectiveFrom: '2026-12-01',
    });

    const earlier = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/prices`,
      headers: auth(admin),
      payload: { amountMinor: 400, effectiveFrom: '2026-11-10' },
    });
    expect(earlier.statusCode).toBe(201);

    const listed = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${productId}/prices`,
      headers: auth(admin),
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().currency).toBe('USD');
    expect(
      listed.json().items.map((price: { effectiveFrom: string }) => price.effectiveFrom),
    ).toEqual(['2026-12-01', '2026-11-10']);

    const duplicate = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/prices`,
      headers: auth(admin),
      payload: { amountMinor: 475, effectiveFrom: '2026-12-01' },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');

    const forbidden = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/prices`,
      headers: auth(staff),
      payload: { amountMinor: 475, effectiveFrom: '2027-01-01' },
    });
    expect(forbidden.statusCode).toBe(403);

    const unknown = await app.inject({
      method: 'GET',
      url: `/api/v1/products/${randomUUID()}/prices`,
      headers: auth(admin),
    });
    expect(unknown.statusCode).toBe(404);
  });

  it('creates, lists and updates raw and processed products', async () => {
    const reader = await tokenFor('staff@inventory.test');
    const token = await tokenFor('admin@inventory.test');
    const name = `Watermelon ${randomUUID()}`;

    const before = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: auth(reader),
    });
    expect(before.statusCode).toBe(200);
    expect(Array.isArray(before.json().items)).toBe(true);

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: auth(token),
      payload: {
        categoryId,
        name: `  ${name}  `,
        kind: 'PROCESSED',
        inventoryUnitId: unitId,
        salesUnitId: unitId,
        purchaseUnitId: unitId,
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      categoryId,
      name,
      kind: 'PROCESSED',
      inventoryUnitId: unitId,
      salesUnitId: unitId,
      purchaseUnitId: unitId,
      isActive: true,
    });

    const product = created.json();
    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/products',
      headers: auth(reader),
    });
    expect(listed.json().items).toContainEqual(product);

    const renamed = `Seedless watermelon ${randomUUID()}`;
    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/products/${product.id}`,
      headers: auth(token),
      payload: {
        categoryId,
        name: renamed,
        kind: 'RAW',
        inventoryUnitId: unitId,
        salesUnitId: unitId,
        isActive: false,
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: product.id,
      categoryId,
      name: renamed,
      kind: 'RAW',
      inventoryUnitId: unitId,
      salesUnitId: unitId,
      isActive: false,
      createdAt: product.createdAt,
      updatedAt: expect.any(String),
    });
    expect(updated.json().purchaseUnitId).toBeUndefined();
  });

  it('rejects product references outside the organization catalog', async () => {
    const token = await tokenFor('admin@inventory.test');
    const missing = randomUUID();

    const unknownCategory = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: auth(token),
      payload: {
        categoryId: missing,
        name: 'Missing Category Product',
        kind: 'RAW',
        inventoryUnitId: unitId,
        salesUnitId: unitId,
      },
    });
    const unknownUnit = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: auth(token),
      payload: {
        categoryId,
        name: 'Missing Unit Product',
        kind: 'RAW',
        inventoryUnitId: missing,
        salesUnitId: unitId,
      },
    });

    for (const response of [unknownCategory, unknownUnit]) {
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
    }
  });

  it('returns not found for an unknown product', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/products/${randomUUID()}`,
      headers: auth(token),
      payload: {
        categoryId,
        name: 'Missing Product',
        kind: 'RAW',
        inventoryUnitId: unitId,
        salesUnitId: unitId,
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('rejects invalid catalogue bodies with the standard validation envelope', async () => {
    const token = await tokenFor('admin@inventory.test');

    const category = await app.inject({
      method: 'POST',
      url: '/api/v1/product-categories',
      headers: auth(token),
      payload: { name: '   ' },
    });
    const unit = await app.inject({
      method: 'POST',
      url: '/api/v1/measurement-units',
      headers: auth(token),
      payload: { code: '   ', name: 'Kilogram' },
    });
    const presentation = await app.inject({
      method: 'POST',
      url: `/api/v1/products/${productId}/presentations`,
      headers: auth(token),
      payload: { name: 'Covered tray', averageWeightGrams: 0 },
    });
    const product = await app.inject({
      method: 'POST',
      url: '/api/v1/products',
      headers: auth(token),
      payload: {
        categoryId,
        name: ' ',
        kind: 'RAW',
        inventoryUnitId: unitId,
        salesUnitId: unitId,
      },
    });

    for (const response of [category, unit, presentation, product]) {
      expect(response.statusCode).toBe(422);
      expect(response.json().error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(response.json().error.details.issues)).toBe(true);
    }
  });
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Test Organization',
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
}
