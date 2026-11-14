import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import {
  PURCHASE_STATUSES,
  STOCK_MOVEMENT_REASONS,
  STOCK_MOVEMENT_SOURCE_TYPES,
} from '@inventory-u3/domain';

import { branches } from './branch.js';
import { products, measurementUnits } from './catalog.js';
import { nowDefault, uuidDefault } from './defaults.js';
import { enumCheck } from './enum-check.js';
import { organizations, users } from './organization.js';
import { suppliers } from './supplier.js';

export const purchases = sqliteTable(
  'purchases',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    supplierId: text('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    status: text('status', { enum: PURCHASE_STATUSES }).notNull(),
    deliveryDate: text('delivery_date').notNull(),
    currency: text('currency').notNull(),
    totalMinor: integer('total_minor').notNull(),
    note: text('note'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    receivedByUserId: text('received_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    receivedAt: integer('received_at', { mode: 'timestamp_ms' }),
    cancelledAt: integer('cancelled_at', { mode: 'timestamp_ms' }),
    correctedByUserId: text('corrected_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    correctedAt: integer('corrected_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
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
    enumCheck('purchases_status_in_values', 'status', PURCHASE_STATUSES),
  ],
);

export const purchaseItems = sqliteTable(
  'purchase_items',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    purchaseId: text('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    unitId: text('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    unitPriceMinor: integer('unit_price_minor').notNull(),
    lineTotalMinor: integer('line_total_minor').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('purchase_items_organization_purchase_idx').on(table.organizationId, table.purchaseId),
    index('purchase_items_organization_product_idx').on(table.organizationId, table.productId),
  ],
);

export const purchaseCorrections = sqliteTable(
  'purchase_corrections',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    purchaseId: text('purchase_id')
      .notNull()
      .references(() => purchases.id, { onDelete: 'restrict' }),
    correctedByUserId: text('corrected_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reason: text('reason').notNull(),
    beforeTotalMinor: integer('before_total_minor').notNull(),
    afterTotalMinor: integer('after_total_minor').notNull(),
    correctedAt: integer('corrected_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('purchase_corrections_organization_purchase_uq').on(
      table.organizationId,
      table.purchaseId,
    ),
  ],
);

export const stockMovements = sqliteTable(
  'stock_movements',
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
    quantityDelta: real('quantity_delta').notNull(),
    reason: text('reason', { enum: STOCK_MOVEMENT_REASONS }).notNull(),
    sourceType: text('source_type', { enum: STOCK_MOVEMENT_SOURCE_TYPES }),
    sourceId: text('source_id'),
    correctsMovementId: text('corrects_movement_id').references(
      (): AnySQLiteColumn => stockMovements.id,
      { onDelete: 'restrict' },
    ),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }).notNull(),
    recordedByUserId: text('recorded_by_user_id')
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
    enumCheck('stock_movements_reason_in_values', 'reason', STOCK_MOVEMENT_REASONS),
    enumCheck('stock_movements_source_type_in_values', 'source_type', STOCK_MOVEMENT_SOURCE_TYPES),
  ],
);
