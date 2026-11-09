/**
 * Product catalog master data: units, categories, products and presentations.
 *
 * These rows are organization-owned, not branch-owned. A branch owns its stock,
 * but it does not own a private copy of the catalogue (BQ-06 working assumption).
 * Every table still carries `organization_id` so a read cannot lose the tenant
 * boundary behind a join.
 *
 * Average weight, prices and the raw/processed distinction are intentionally
 * absent here; M1-T3 and M2 add them once their rules are implemented.
 */

import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organization.js';

export const measurementUnits = pgTable(
  'measurement_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('measurement_units_organization_code_uq').on(table.organizationId, table.code),
    index('measurement_units_organization_active_idx').on(table.organizationId, table.isActive),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_categories_organization_name_uq').on(table.organizationId, table.name),
    index('product_categories_organization_active_idx').on(table.organizationId, table.isActive),
  ],
);

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => productCategories.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    inventoryUnitId: uuid('inventory_unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    salesUnitId: uuid('sales_unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    purchaseUnitId: uuid('purchase_unit_id').references(() => measurementUnits.id, {
      onDelete: 'restrict',
    }),
    productionUnitId: uuid('production_unit_id').references(() => measurementUnits.id, {
      onDelete: 'restrict',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('products_organization_active_idx').on(table.organizationId, table.isActive),
    index('products_organization_category_idx').on(table.organizationId, table.categoryId),
  ],
);

export const productPresentations = pgTable(
  'product_presentations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_presentations_product_name_uq').on(table.productId, table.name),
    index('product_presentations_product_active_idx').on(table.productId, table.isActive),
  ],
);
