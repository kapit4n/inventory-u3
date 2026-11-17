import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import {
  DAILY_CLOSING_COST_BASES,
  DAILY_CLOSING_STATUSES,
  PRODUCT_KINDS,
} from '@inventory-u3/domain';

import { branches } from './branch.js';
import { measurementUnits, products } from './catalog.js';
import { nowDefault, uuidDefault } from './defaults.js';
import { enumCheck } from './enum-check.js';
import { organizations, users } from './organization.js';

export const dailyClosings = sqliteTable(
  'daily_closings',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    businessDate: text('business_date').notNull(),
    version: integer('version').notNull(),
    previousClosingId: text('previous_closing_id').references(
      (): AnySQLiteColumn => dailyClosings.id,
      { onDelete: 'restrict' },
    ),
    status: text('status', { enum: DAILY_CLOSING_STATUSES }).notNull(),
    currency: text('currency').notNull(),
    purchasesTotalMinor: integer('purchases_total_minor').notNull(),
    purchaseCount: integer('purchase_count').notNull(),
    unreceivedPurchaseCount: integer('unreceived_purchase_count').notNull(),
    productionBatchCount: integer('production_batch_count').notNull(),
    productionDraftCount: integer('production_draft_count').notNull(),
    productionTrayCount: integer('production_tray_count').notNull(),
    productionEstimatedWeightGrams: integer('production_estimated_weight_grams').notNull(),
    salesCheckpointCount: integer('sales_checkpoint_count').notNull(),
    draftSalesCheckpointCount: integer('draft_sales_checkpoint_count').notNull(),
    salesTotalMinor: integer('sales_total_minor').notNull(),
    wasteRecordCount: integer('waste_record_count').notNull(),
    inventoryDifferenceProductCount: integer('inventory_difference_product_count').notNull(),
    estimatedRevenueMinor: integer('estimated_revenue_minor').notNull(),
    estimatedCostMinor: integer('estimated_cost_minor').notNull(),
    estimatedGrossProfitMinor: integer('estimated_gross_profit_minor').notNull(),
    missingCostProductCount: integer('missing_cost_product_count').notNull(),
    negativeStockProductCount: integer('negative_stock_product_count').notNull(),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reviewedByUserId: text('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
    confirmedByUserId: text('confirmed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
    reopenedByUserId: text('reopened_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reopenedAt: integer('reopened_at', { mode: 'timestamp_ms' }),
    reopenReason: text('reopen_reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    uniqueIndex('daily_closings_organization_branch_date_version_uq').on(
      table.organizationId,
      table.branchId,
      table.businessDate,
      table.version,
    ),
    index('daily_closings_organization_business_date_idx').on(
      table.organizationId,
      table.businessDate,
      table.createdAt,
    ),
    index('daily_closings_organization_branch_idx').on(table.organizationId, table.branchId),
    index('daily_closings_organization_status_idx').on(table.organizationId, table.status),
    enumCheck('daily_closings_status_in_values', 'status', DAILY_CLOSING_STATUSES),
  ],
);

export const dailyClosingItems = sqliteTable(
  'daily_closing_items',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    dailyClosingId: text('daily_closing_id')
      .notNull()
      .references(() => dailyClosings.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productKind: text('product_kind', { enum: PRODUCT_KINDS }).notNull(),
    unitId: text('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    openingQuantityMilli: integer('opening_quantity_milli').notNull(),
    purchasedQuantityMilli: integer('purchased_quantity_milli').notNull(),
    producedQuantityMilli: integer('produced_quantity_milli').notNull(),
    soldQuantityMilli: integer('sold_quantity_milli').notNull(),
    wasteQuantityMilli: integer('waste_quantity_milli').notNull(),
    adjustmentQuantityMilli: integer('adjustment_quantity_milli').notNull(),
    correctionQuantityMilli: integer('correction_quantity_milli').notNull(),
    reconciliationDifferenceQuantityMilli: integer(
      'reconciliation_difference_quantity_milli',
    ).notNull(),
    closingQuantityMilli: integer('closing_quantity_milli').notNull(),
    estimatedRevenueMinor: integer('estimated_revenue_minor').notNull(),
    unitCostAmountMinor: integer('unit_cost_amount_minor'),
    costBasis: text('cost_basis', { enum: DAILY_CLOSING_COST_BASES }).notNull(),
    estimatedCostOfSalesMinor: integer('estimated_cost_of_sales_minor').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    primaryKey({ columns: [table.dailyClosingId, table.productId] }),
    index('daily_closing_items_organization_closing_idx').on(
      table.organizationId,
      table.dailyClosingId,
    ),
    index('daily_closing_items_organization_product_idx').on(table.organizationId, table.productId),
    enumCheck('daily_closing_items_product_kind_in_values', 'product_kind', PRODUCT_KINDS),
    enumCheck('daily_closing_items_cost_basis_in_values', 'cost_basis', DAILY_CLOSING_COST_BASES),
  ],
);
