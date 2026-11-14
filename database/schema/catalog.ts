/**
 * Product catalog master data: units, categories, products and presentations.
 *
 * These rows are organization-owned, not branch-owned. A branch owns its stock,
 * but it does not own a private copy of the catalogue (BQ-06 working assumption).
 * Every table still carries `organization_id` so a read cannot lose the tenant
 * boundary behind a join.
 *
 * Products carry the raw/processed kind. Presentations carry the configured
 * average weight per tray as integer grams. Selling prices are append-only,
 * effective-dated rows; historical production and sales snapshots remain for
 * later milestones.
 */

import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { productKindEnum, productPriceBasisEnum } from './enums.js';
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
    kind: productKindEnum('kind').notNull(),
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
    averageWeightGrams: integer('average_weight_grams').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_presentations_product_name_uq').on(table.productId, table.name),
    index('product_presentations_product_active_idx').on(table.productId, table.isActive),
  ],
);

/**
 * Selling-price history.
 *
 * There is no `updated_at`: a price change is a new row, and the unique key
 * prevents two prices for the same product starting on the same business date.
 * The basis is captured with the amount so editing the product kind later
 * cannot reinterpret an existing price.
 */
export const productPriceHistory = pgTable(
  'product_price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    priceBasis: productPriceBasisEnum('price_basis').notNull(),
    effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_price_history_product_effective_uq').on(
      table.productId,
      table.effectiveFrom,
    ),
    index('product_price_history_organization_product_effective_idx').on(
      table.organizationId,
      table.productId,
      table.effectiveFrom,
    ),
  ],
);
