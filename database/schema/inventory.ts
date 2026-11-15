import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { products } from './catalog.js';
import { stockAdjustmentKindEnum } from './enums.js';
import { organizations, users } from './organization.js';

export const stockAdjustments = pgTable(
  'stock_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    kind: stockAdjustmentKindEnum('kind').notNull(),
    quantityDeltaMilli: integer('quantity_delta_milli').notNull(),
    reason: text('reason').notNull(),
    expectedQuantityMilli: integer('expected_quantity_milli'),
    countedQuantityMilli: integer('counted_quantity_milli'),
    note: text('note'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    recordedByUserId: uuid('recorded_by_user_id')
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
  ],
);

export const inventoryWaste = pgTable(
  'inventory_waste',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    recordedByUserId: uuid('recorded_by_user_id')
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
