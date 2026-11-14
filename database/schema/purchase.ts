import {
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { products, measurementUnits } from './catalog.js';
import {
  purchaseStatusEnum,
  stockMovementReasonEnum,
  stockMovementSourceTypeEnum,
} from './enums.js';
import { organizations, users } from './organization.js';
import { suppliers } from './supplier.js';

export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    status: purchaseStatusEnum('status').notNull(),
    deliveryDate: date('delivery_date', { mode: 'string' }).notNull(),
    currency: text('currency').notNull(),
    totalMinor: integer('total_minor').notNull(),
    note: text('note'),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    receivedByUserId: uuid('received_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    correctedByUserId: uuid('corrected_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    correctedAt: timestamp('corrected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('purchases_organization_delivery_idx').on(
      table.organizationId,
      table.deliveryDate,
      table.createdAt,
    ),
    index('purchases_organization_branch_idx').on(table.organizationId, table.branchId),
    index('purchases_organization_supplier_idx').on(table.organizationId, table.supplierId),
    index('purchases_organization_status_idx').on(table.organizationId, table.status),
  ],
);

export const purchaseItems = pgTable(
  'purchase_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    lineTotalMinor: integer('line_total_minor').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('purchase_items_organization_purchase_idx').on(table.organizationId, table.purchaseId),
    index('purchase_items_organization_product_idx').on(table.organizationId, table.productId),
  ],
);

export const purchaseCorrections = pgTable(
  'purchase_corrections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    purchaseId: uuid('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'restrict' }),
    correctedByUserId: uuid('corrected_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason').notNull(),
    beforeTotalMinor: integer('before_total_minor').notNull(),
    afterTotalMinor: integer('after_total_minor').notNull(),
    correctedAt: timestamp('corrected_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('purchase_corrections_organization_purchase_uq').on(
      table.organizationId,
      table.purchaseId,
    ),
  ],
);

export const stockMovements = pgTable(
  'stock_movements',
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
    quantityDelta: doublePrecision('quantity_delta').notNull(),
    reason: stockMovementReasonEnum('reason').notNull(),
    sourceType: stockMovementSourceTypeEnum('source_type'),
    sourceId: text('source_id'),
    correctsMovementId: uuid('corrects_movement_id').references(
      (): AnyPgColumn => stockMovements.id,
      { onDelete: 'restrict' },
    ),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    recordedByUserId: uuid('recorded_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    note: text('note'),
  },
  (table) => [
    index('stock_movements_organization_branch_idx').on(table.organizationId, table.branchId),
    index('stock_movements_organization_source_idx').on(
      table.organizationId,
      table.sourceType,
      table.sourceId,
    ),
    index('stock_movements_organization_product_occurred_idx').on(
      table.organizationId,
      table.productId,
      table.occurredAt,
    ),
  ],
);
