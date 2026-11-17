/**
 * Daily closing snapshots and their per-product lines.
 *
 * Every version is immutable once confirmed. Reopening marks the confirmed
 * version REOPENED and creates a new draft version pointing at it, so the
 * previous snapshot remains auditable without a separate history table.
 */

import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { measurementUnits, products } from './catalog.js';
import { dailyClosingCostBasisEnum, dailyClosingStatusEnum, productKindEnum } from './enums.js';
import { organizations, users } from './organization.js';

export const dailyClosings = pgTable(
  'daily_closings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    businessDate: date('business_date', { mode: 'string' }).notNull(),
    version: integer('version').notNull(),
    previousClosingId: uuid('previous_closing_id').references((): AnyPgColumn => dailyClosings.id, {
      onDelete: 'restrict',
    }),
    status: dailyClosingStatusEnum('status').notNull(),
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
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    reviewedByUserId: uuid('reviewed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    confirmedByUserId: uuid('confirmed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    reopenedByUserId: uuid('reopened_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    reopenedAt: timestamp('reopened_at', { withTimezone: true }),
    reopenReason: text('reopen_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
  ],
);

export const dailyClosingItems = pgTable(
  'daily_closing_items',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    dailyClosingId: uuid('daily_closing_id')
      .notNull()
      .references(() => dailyClosings.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productKind: productKindEnum('product_kind').notNull(),
    unitId: uuid('unit_id')
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
    costBasis: dailyClosingCostBasisEnum('cost_basis').notNull(),
    estimatedCostOfSalesMinor: integer('estimated_cost_of_sales_minor').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.dailyClosingId, table.productId] }),
    index('daily_closing_items_organization_closing_idx').on(
      table.organizationId,
      table.dailyClosingId,
    ),
    index('daily_closing_items_organization_product_idx').on(table.organizationId, table.productId),
  ],
);
