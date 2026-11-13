/**
 * Product catalog persistence, on both engines, including tenant isolation.
 *
 * SQLite always runs against a temporary migrated file. The PostgreSQL half
 * skips itself when `TEST_DATABASE_URL` is absent, matching the repository's
 * dual-engine policy (ADR 0025).
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
  createMeasurementUnit,
  createProduct,
  createProductCategory,
  createProductPresentation,
  updateMeasurementUnit,
  updateProductCategory,
  updateProductPresentation,
} from '@inventory-u3/domain';
import {
  asMeasurementUnitId,
  asOrganizationId,
  asProductCategoryId,
  asProductId,
  asProductPresentationId,
  type MeasurementUnitId,
  type OrganizationId,
  type ProductCategoryId,
  type ProductId,
  type ProductPresentationId,
} from '@inventory-u3/types';

import { DrizzleMeasurementUnitRepository } from '../src/infrastructure/persistence/repositories/measurement-unit-repository.js';
import { DrizzleProductCategoryRepository } from '../src/infrastructure/persistence/repositories/product-category-repository.js';
import { DrizzleProductPresentationRepository } from '../src/infrastructure/persistence/repositories/product-presentation-repository.js';
import { DrizzleProductRepository } from '../src/infrastructure/persistence/repositories/product-repository.js';
import { createPostgresConnection } from '../src/infrastructure/persistence/postgres/connection.js';
import { SQLiteMeasurementUnitRepository } from '../src/infrastructure/persistence/sqlite/repositories/measurement-unit-repository.js';
import { SQLiteProductCategoryRepository } from '../src/infrastructure/persistence/sqlite/repositories/product-category-repository.js';
import { SQLiteProductPresentationRepository } from '../src/infrastructure/persistence/sqlite/repositories/product-presentation-repository.js';
import { SQLiteProductRepository } from '../src/infrastructure/persistence/sqlite/repositories/product-repository.js';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NOW = '2026-11-09T12:00:00.000Z';

const ORGANIZATION_A = asOrganizationId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const ORGANIZATION_B = asOrganizationId('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

function suffix(): string {
  return randomUUID().slice(0, 8);
}

describe('product catalog repositories (SQLite)', () => {
  let dir: string;
  let connection: ReturnType<typeof createSqliteConnection>;
  let measurementUnits: SQLiteMeasurementUnitRepository;
  let productCategories: SQLiteProductCategoryRepository;
  let products: SQLiteProductRepository;
  let productPresentations: SQLiteProductPresentationRepository;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-catalog-'));
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

    measurementUnits = new SQLiteMeasurementUnitRepository(connection.db);
    productCategories = new SQLiteProductCategoryRepository(connection.db);
    products = new SQLiteProductRepository(connection.db);
    productPresentations = new SQLiteProductPresentationRepository(connection.db);
  });

  afterAll(() => {
    connection?.client.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('persists and isolates measurement units', async () => {
    const tag = suffix();
    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_A,
          code: `kg-${tag}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_A,
          code: `tray-${tag}`,
          name: 'Tray',
        },
        NOW,
      ),
    );
    await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_B,
          code: `kg-${tag}`,
          name: 'Other tenant kilogram',
        },
        NOW,
      ),
    );

    await expect(measurementUnits.findById(ORGANIZATION_A, kilogram.id)).resolves.toEqual(kilogram);
    await expect(measurementUnits.findById(ORGANIZATION_B, kilogram.id)).resolves.toBeUndefined();

    const units = await measurementUnits.listByOrganization(ORGANIZATION_A);
    expect(units.map((unit) => unit.code)).toEqual([`kg-${tag}`, `tray-${tag}`]);

    const otherUnits = await measurementUnits.listByOrganization(ORGANIZATION_B);
    expect(otherUnits.map((unit) => unit.code)).toEqual([`kg-${tag}`]);
  });

  it('persists and isolates product categories', async () => {
    const tag = suffix();
    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_A,
          name: `Fruit ${tag}`,
        },
        NOW,
      ),
    );
    await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_A,
          name: `Vegetables ${tag}`,
        },
        NOW,
      ),
    );
    await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_B,
          name: `Other tenant ${tag}`,
        },
        NOW,
      ),
    );

    await expect(productCategories.findById(ORGANIZATION_A, fruit.id)).resolves.toEqual(fruit);
    await expect(productCategories.findById(ORGANIZATION_B, fruit.id)).resolves.toBeUndefined();

    const categories = await productCategories.listByOrganization(ORGANIZATION_A);
    expect(categories.map((category) => category.name)).toEqual([
      `Fruit ${tag}`,
      `Vegetables ${tag}`,
    ]);
  });

  it('persists products with explicit units and isolates them', async () => {
    const tag = suffix();
    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_A,
          code: `kg-${tag}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    const tray = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_A,
          code: `tray-${tag}`,
          name: 'Tray',
        },
        NOW,
      ),
    );
    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_A,
          name: `Fruit ${tag}`,
        },
        NOW,
      ),
    );
    await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_B,
          name: `Other tenant ${tag}`,
        },
        NOW,
      ),
    );

    const watermelon = await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId: ORGANIZATION_A,
          categoryId: fruit.id,
          name: `Watermelon ${tag}`,
          kind: 'PROCESSED',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
          purchaseUnitId: kilogram.id,
          productionUnitId: tray.id,
        },
        NOW,
      ),
    );
    await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId: ORGANIZATION_A,
          categoryId: fruit.id,
          name: `Bananas ${tag}`,
          kind: 'RAW',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
        },
        NOW,
      ),
    );

    await expect(products.findById(ORGANIZATION_A, watermelon.id)).resolves.toEqual(watermelon);
    await expect(products.findById(ORGANIZATION_B, watermelon.id)).resolves.toBeUndefined();

    const catalog = await products.listByOrganization(ORGANIZATION_A);
    expect(catalog.map((product) => product.name)).toEqual([`Bananas ${tag}`, `Watermelon ${tag}`]);
  });

  it('persists presentations and isolates them by organization and product', async () => {
    const tag = suffix();
    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_A,
          code: `kg-${tag}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_A,
          name: `Fruit ${tag}`,
        },
        NOW,
      ),
    );
    const watermelon = await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId: ORGANIZATION_A,
          categoryId: fruit.id,
          name: `Watermelon ${tag}`,
          kind: 'PROCESSED',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
        },
        NOW,
      ),
    );

    const presentation = await productPresentations.create(
      createProductPresentation(
        {
          id: asProductPresentationId(randomUUID()),
          organizationId: ORGANIZATION_A,
          productId: watermelon.id,
          name: `Covered tray ${tag}`,
          averageWeightGrams: 500,
        },
        NOW,
      ),
    );
    await productPresentations.create(
      createProductPresentation(
        {
          id: asProductPresentationId(randomUUID()),
          organizationId: ORGANIZATION_A,
          productId: watermelon.id,
          name: `Open tray ${tag}`,
          averageWeightGrams: 700,
        },
        NOW,
      ),
    );

    await expect(productPresentations.findById(ORGANIZATION_A, presentation.id)).resolves.toEqual(
      presentation,
    );
    await expect(
      productPresentations.findById(ORGANIZATION_B, presentation.id),
    ).resolves.toBeUndefined();
    await expect(
      productPresentations.listByProduct(ORGANIZATION_B, watermelon.id),
    ).resolves.toEqual([]);

    const presentations = await productPresentations.listByProduct(ORGANIZATION_A, watermelon.id);
    expect(presentations.map((item) => item.name)).toEqual([
      `Covered tray ${tag}`,
      `Open tray ${tag}`,
    ]);
  });

  it('updates catalog rows and finds them by their unique business key', async () => {
    const tag = suffix();
    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: ORGANIZATION_A,
          code: `kg-${tag}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: ORGANIZATION_A,
          name: `Fruit ${tag}`,
        },
        NOW,
      ),
    );
    const watermelon = await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId: ORGANIZATION_A,
          categoryId: fruit.id,
          name: `Watermelon ${tag}`,
          kind: 'PROCESSED',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
        },
        NOW,
      ),
    );
    const tray = await productPresentations.create(
      createProductPresentation(
        {
          id: asProductPresentationId(randomUUID()),
          organizationId: ORGANIZATION_A,
          productId: watermelon.id,
          name: `Covered tray ${tag}`,
          averageWeightGrams: 500,
        },
        NOW,
      ),
    );

    const later = '2026-11-09T13:00:00.000Z';
    const updatedUnit = updateMeasurementUnit(
      kilogram,
      { code: `kilos-${tag}`, name: 'Kilograms', isActive: false },
      later,
    );
    const updatedCategory = updateProductCategory(
      fruit,
      { name: `Fresh fruit ${tag}`, isActive: false },
      later,
    );
    const updatedPresentation = updateProductPresentation(
      tray,
      { name: `Large tray ${tag}`, averageWeightGrams: 750, isActive: false },
      later,
    );

    await expect(measurementUnits.update(updatedUnit)).resolves.toEqual(updatedUnit);
    await expect(productCategories.update(updatedCategory)).resolves.toEqual(updatedCategory);
    await expect(productPresentations.update(updatedPresentation)).resolves.toEqual(
      updatedPresentation,
    );

    await expect(measurementUnits.findByCode(ORGANIZATION_A, updatedUnit.code)).resolves.toEqual(
      updatedUnit,
    );
    await expect(
      productCategories.findByName(ORGANIZATION_A, updatedCategory.name),
    ).resolves.toEqual(updatedCategory);
    await expect(
      productPresentations.findByProductAndName(
        ORGANIZATION_A,
        watermelon.id,
        updatedPresentation.name,
      ),
    ).resolves.toEqual(updatedPresentation);

    await expect(
      measurementUnits.update({ ...updatedUnit, organizationId: ORGANIZATION_B }),
    ).resolves.toBeUndefined();
    await expect(
      productCategories.update({ ...updatedCategory, organizationId: ORGANIZATION_B }),
    ).resolves.toBeUndefined();
    await expect(
      productPresentations.update({ ...updatedPresentation, organizationId: ORGANIZATION_B }),
    ).resolves.toBeUndefined();
  });
});

const postgresUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!postgresUrl)('product catalog repositories (PostgreSQL)', () => {
  let connection: ReturnType<typeof createPostgresConnection>;
  let organizationA: OrganizationId;
  let organizationB: OrganizationId;
  const unitIds: MeasurementUnitId[] = [];
  const categoryIds: ProductCategoryId[] = [];
  const productIds: ProductId[] = [];
  const presentationIds: ProductPresentationId[] = [];

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
        name: `Catalog Test A ${organizationA}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
      {
        id: organizationB,
        name: `Catalog Test B ${organizationB}`,
        timezone: 'UTC',
        currency: 'USD',
        isActive: true,
      },
    ]);
  });

  afterAll(async () => {
    if (connection) {
      if (presentationIds.length > 0) {
        await connection.db
          .delete(pgSchema.productPresentations)
          .where(inArray(pgSchema.productPresentations.id, presentationIds));
      }
      if (productIds.length > 0) {
        await connection.db
          .delete(pgSchema.products)
          .where(inArray(pgSchema.products.id, productIds));
      }
      if (categoryIds.length > 0) {
        await connection.db
          .delete(pgSchema.productCategories)
          .where(inArray(pgSchema.productCategories.id, categoryIds));
      }
      if (unitIds.length > 0) {
        await connection.db
          .delete(pgSchema.measurementUnits)
          .where(inArray(pgSchema.measurementUnits.id, unitIds));
      }
      await connection.db
        .delete(pgSchema.organizations)
        .where(inArray(pgSchema.organizations.id, [organizationA, organizationB]));
      await connection.sql.end({ timeout: 5 });
    }
  });

  it('persists the whole catalog for one organization and isolates another', async () => {
    const measurementUnits = new DrizzleMeasurementUnitRepository(connection.db);
    const productCategories = new DrizzleProductCategoryRepository(connection.db);
    const products = new DrizzleProductRepository(connection.db);
    const productPresentations = new DrizzleProductPresentationRepository(connection.db);

    const tag = suffix();
    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: organizationA,
          code: `kg-${tag}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    unitIds.push(kilogram.id);
    const tray = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: organizationA,
          code: `tray-${tag}`,
          name: 'Tray',
        },
        NOW,
      ),
    );
    unitIds.push(tray.id);
    const otherUnit = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: organizationB,
          code: `kg-${tag}`,
          name: 'Other tenant kilogram',
        },
        NOW,
      ),
    );
    unitIds.push(otherUnit.id);

    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: organizationA,
          name: `Fruit ${tag}`,
        },
        NOW,
      ),
    );
    categoryIds.push(fruit.id);
    const otherCategory = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: organizationB,
          name: `Other tenant ${tag}`,
        },
        NOW,
      ),
    );
    categoryIds.push(otherCategory.id);

    const watermelon = await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId: organizationA,
          categoryId: fruit.id,
          name: `Watermelon ${tag}`,
          kind: 'PROCESSED',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
          purchaseUnitId: kilogram.id,
          productionUnitId: tray.id,
        },
        NOW,
      ),
    );
    productIds.push(watermelon.id);

    const presentation = await productPresentations.create(
      createProductPresentation(
        {
          id: asProductPresentationId(randomUUID()),
          organizationId: organizationA,
          productId: watermelon.id,
          name: `Covered tray ${tag}`,
          averageWeightGrams: 500,
        },
        NOW,
      ),
    );
    presentationIds.push(presentation.id);

    await expect(measurementUnits.findById(organizationA, kilogram.id)).resolves.toEqual(kilogram);
    await expect(measurementUnits.findById(organizationB, kilogram.id)).resolves.toBeUndefined();
    await expect(productCategories.findById(organizationA, fruit.id)).resolves.toEqual(fruit);
    await expect(productCategories.findById(organizationB, fruit.id)).resolves.toBeUndefined();
    await expect(products.findById(organizationA, watermelon.id)).resolves.toEqual(watermelon);
    await expect(products.findById(organizationB, watermelon.id)).resolves.toBeUndefined();
    await expect(productPresentations.findById(organizationA, presentation.id)).resolves.toEqual(
      presentation,
    );
    await expect(
      productPresentations.findById(organizationB, presentation.id),
    ).resolves.toBeUndefined();

    await expect(measurementUnits.listByOrganization(organizationA)).resolves.toEqual([
      kilogram,
      tray,
    ]);
    await expect(productCategories.listByOrganization(organizationA)).resolves.toEqual([fruit]);
    await expect(products.listByOrganization(organizationA)).resolves.toEqual([watermelon]);
    await expect(productPresentations.listByProduct(organizationA, watermelon.id)).resolves.toEqual(
      [presentation],
    );
    await expect(productPresentations.listByProduct(organizationB, watermelon.id)).resolves.toEqual(
      [],
    );
  });

  it('updates catalog rows and finds them by their unique business key', async () => {
    const measurementUnits = new DrizzleMeasurementUnitRepository(connection.db);
    const productCategories = new DrizzleProductCategoryRepository(connection.db);
    const products = new DrizzleProductRepository(connection.db);
    const productPresentations = new DrizzleProductPresentationRepository(connection.db);

    const tag = suffix();
    const kilogram = await measurementUnits.create(
      createMeasurementUnit(
        {
          id: asMeasurementUnitId(randomUUID()),
          organizationId: organizationA,
          code: `kg-${tag}`,
          name: 'Kilogram',
        },
        NOW,
      ),
    );
    unitIds.push(kilogram.id);
    const fruit = await productCategories.create(
      createProductCategory(
        {
          id: asProductCategoryId(randomUUID()),
          organizationId: organizationA,
          name: `Fruit ${tag}`,
        },
        NOW,
      ),
    );
    categoryIds.push(fruit.id);
    const watermelon = await products.create(
      createProduct(
        {
          id: asProductId(randomUUID()),
          organizationId: organizationA,
          categoryId: fruit.id,
          name: `Watermelon ${tag}`,
          kind: 'PROCESSED',
          inventoryUnitId: kilogram.id,
          salesUnitId: kilogram.id,
        },
        NOW,
      ),
    );
    productIds.push(watermelon.id);
    const tray = await productPresentations.create(
      createProductPresentation(
        {
          id: asProductPresentationId(randomUUID()),
          organizationId: organizationA,
          productId: watermelon.id,
          name: `Covered tray ${tag}`,
          averageWeightGrams: 500,
        },
        NOW,
      ),
    );
    presentationIds.push(tray.id);

    const later = '2026-11-09T13:00:00.000Z';
    const updatedUnit = updateMeasurementUnit(
      kilogram,
      { code: `kilos-${tag}`, name: 'Kilograms', isActive: false },
      later,
    );
    const updatedCategory = updateProductCategory(
      fruit,
      { name: `Fresh fruit ${tag}`, isActive: false },
      later,
    );
    const updatedPresentation = updateProductPresentation(
      tray,
      { name: `Large tray ${tag}`, averageWeightGrams: 750, isActive: false },
      later,
    );

    await expect(measurementUnits.update(updatedUnit)).resolves.toEqual(updatedUnit);
    await expect(productCategories.update(updatedCategory)).resolves.toEqual(updatedCategory);
    await expect(productPresentations.update(updatedPresentation)).resolves.toEqual(
      updatedPresentation,
    );

    await expect(measurementUnits.findByCode(organizationA, updatedUnit.code)).resolves.toEqual(
      updatedUnit,
    );
    await expect(
      productCategories.findByName(organizationA, updatedCategory.name),
    ).resolves.toEqual(updatedCategory);
    await expect(
      productPresentations.findByProductAndName(
        organizationA,
        watermelon.id,
        updatedPresentation.name,
      ),
    ).resolves.toEqual(updatedPresentation);

    await expect(
      measurementUnits.update({ ...updatedUnit, organizationId: organizationB }),
    ).resolves.toBeUndefined();
    await expect(
      productCategories.update({ ...updatedCategory, organizationId: organizationB }),
    ).resolves.toBeUndefined();
    await expect(
      productPresentations.update({ ...updatedPresentation, organizationId: organizationB }),
    ).resolves.toBeUndefined();
  });
});
