/**
 * Product catalog master data: the SQLite twin of `database/schema/catalog.ts`.
 *
 * Differences, all forced by SQLite rather than chosen:
 *
 *  - `uuid` is `text`; ids come from the application's `IdGenerator`.
 *  - timestamps are epoch milliseconds, UTC.
 *  - booleans are integers with boolean mode.
 *  - product kinds are text plus a CHECK built from the domain's value list.
 */

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { PRODUCT_KINDS } from '@inventory-u3/domain';

import { nowDefault, uuidDefault } from './defaults.js';
import { enumCheck } from './enum-check.js';
import { organizations } from './organization.js';

export const measurementUnits = sqliteTable(
  'measurement_units',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    uniqueIndex('measurement_units_organization_code_uq').on(table.organizationId, table.code),
    index('measurement_units_organization_active_idx').on(table.organizationId, table.isActive),
  ],
);

export const productCategories = sqliteTable(
  'product_categories',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    uniqueIndex('product_categories_organization_name_uq').on(table.organizationId, table.name),
    index('product_categories_organization_active_idx').on(table.organizationId, table.isActive),
  ],
);

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => productCategories.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    kind: text('kind', { enum: PRODUCT_KINDS }).notNull(),
    inventoryUnitId: text('inventory_unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    salesUnitId: text('sales_unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    purchaseUnitId: text('purchase_unit_id').references(() => measurementUnits.id, {
      onDelete: 'restrict',
    }),
    productionUnitId: text('production_unit_id').references(() => measurementUnits.id, {
      onDelete: 'restrict',
    }),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('products_organization_active_idx').on(table.organizationId, table.isActive),
    index('products_organization_category_idx').on(table.organizationId, table.categoryId),
    enumCheck('products_kind_in_values', 'kind', PRODUCT_KINDS),
  ],
);

export const productPresentations = sqliteTable(
  'product_presentations',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    averageWeightGrams: integer('average_weight_grams').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    uniqueIndex('product_presentations_product_name_uq').on(table.productId, table.name),
    index('product_presentations_product_active_idx').on(table.productId, table.isActive),
  ],
);
