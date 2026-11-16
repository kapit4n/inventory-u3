import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  PRODUCT_KINDS,
  PRODUCT_PRICE_BASES,
  SALES_CHECKPOINT_PERIODS,
  SALES_CHECKPOINT_STATUSES,
  SALES_CHECKPOINT_WEIGHT_BASES,
} from '@inventory-u3/domain';

import { branches } from './branch.js';
import { measurementUnits, products, productPresentations } from './catalog.js';
import { nowDefault, uuidDefault } from './defaults.js';
import { enumCheck } from './enum-check.js';
import { organizations, users } from './organization.js';

export const salesCheckpoints = sqliteTable(
  'sales_checkpoints',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    businessDate: text('business_date').notNull(),
    period: text('period', { enum: SALES_CHECKPOINT_PERIODS }).notNull(),
    status: text('status', { enum: SALES_CHECKPOINT_STATUSES }).notNull(),
    registeredByUserId: text('registered_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    note: text('note'),
    confirmedByUserId: text('confirmed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
    correctedByUserId: text('corrected_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    correctedAt: integer('corrected_at', { mode: 'timestamp_ms' }),
    correctionReason: text('correction_reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    uniqueIndex('sales_checkpoints_organization_branch_date_period_uq').on(
      table.organizationId,
      table.branchId,
      table.businessDate,
      table.period,
    ),
    index('sales_checkpoints_organization_business_date_idx').on(
      table.organizationId,
      table.businessDate,
      table.createdAt,
    ),
    index('sales_checkpoints_organization_branch_idx').on(table.organizationId, table.branchId),
    index('sales_checkpoints_organization_status_idx').on(table.organizationId, table.status),
    enumCheck('sales_checkpoints_period_in_values', 'period', SALES_CHECKPOINT_PERIODS),
    enumCheck('sales_checkpoints_status_in_values', 'status', SALES_CHECKPOINT_STATUSES),
  ],
);

export const salesCheckpointItems = sqliteTable(
  'sales_checkpoint_items',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    checkpointId: text('checkpoint_id')
      .notNull()
      .references(() => salesCheckpoints.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productKind: text('product_kind', { enum: PRODUCT_KINDS }).notNull(),
    unitId: text('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    presentationId: text('presentation_id').references(() => productPresentations.id, {
      onDelete: 'restrict',
    }),
    trayCount: integer('tray_count'),
    averageWeightPerTrayGrams: integer('average_weight_per_tray_grams'),
    estimatedWeightGrams: integer('estimated_weight_grams'),
    measuredWeightGrams: integer('measured_weight_grams'),
    weightBasis: text('weight_basis', { enum: SALES_CHECKPOINT_WEIGHT_BASES }).notNull(),
    sellingPriceAmountMinor: integer('selling_price_amount_minor').notNull(),
    sellingPriceBasis: text('selling_price_basis', { enum: PRODUCT_PRICE_BASES }).notNull(),
    sellingPriceCurrency: text('selling_price_currency').notNull(),
    estimatedSalesValueMinor: integer('estimated_sales_value_minor').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('sales_checkpoint_items_organization_checkpoint_idx').on(
      table.organizationId,
      table.checkpointId,
    ),
    index('sales_checkpoint_items_organization_product_idx').on(
      table.organizationId,
      table.productId,
    ),
    enumCheck('sales_checkpoint_items_product_kind_in_values', 'product_kind', PRODUCT_KINDS),
    enumCheck(
      'sales_checkpoint_items_weight_basis_in_values',
      'weight_basis',
      SALES_CHECKPOINT_WEIGHT_BASES,
    ),
    enumCheck(
      'sales_checkpoint_items_selling_price_basis_in_values',
      'selling_price_basis',
      PRODUCT_PRICE_BASES,
    ),
  ],
);
