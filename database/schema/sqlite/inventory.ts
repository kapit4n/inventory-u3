import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { STOCK_ADJUSTMENT_KINDS } from '@inventory-u3/domain';

import { branches } from './branch.js';
import { products } from './catalog.js';
import { uuidDefault } from './defaults.js';
import { enumCheck } from './enum-check.js';
import { organizations, users } from './organization.js';

export const stockAdjustments = sqliteTable(
  'stock_adjustments',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    kind: text('kind', { enum: STOCK_ADJUSTMENT_KINDS }).notNull(),
    quantityDeltaMilli: integer('quantity_delta_milli').notNull(),
    reason: text('reason').notNull(),
    expectedQuantityMilli: integer('expected_quantity_milli'),
    countedQuantityMilli: integer('counted_quantity_milli'),
    note: text('note'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }).notNull(),
    recordedByUserId: text('recorded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => [
    index('stock_adjustments_organization_branch_occurred_idx').on(
      table.organizationId,
      table.branchId,
      table.occurredAt,
    ),
    index('stock_adjustments_organization_product_idx').on(table.organizationId, table.productId),
    enumCheck('stock_adjustments_kind_in_values', 'kind', STOCK_ADJUSTMENT_KINDS),
  ],
);

export const inventoryWaste = sqliteTable(
  'inventory_waste',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }).notNull(),
    recordedByUserId: text('recorded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => [
    index('inventory_waste_organization_branch_occurred_idx').on(
      table.organizationId,
      table.branchId,
      table.occurredAt,
    ),
    index('inventory_waste_organization_product_idx').on(table.organizationId, table.productId),
  ],
);
