/**
 * Aggregate sales checkpoints and their product lines.
 *
 * A checkpoint belongs to one branch, business date and period. The unique
 * branch/date/period index prevents two parallel reports for the same period.
 * Lines copy the product kind, unit, tray weight and selling price so catalog
 * edits cannot rewrite a confirmed sales history.
 */

import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { measurementUnits, products, productPresentations } from './catalog.js';
import {
  productKindEnum,
  productPriceBasisEnum,
  salesCheckpointPeriodEnum,
  salesCheckpointStatusEnum,
  salesCheckpointWeightBasisEnum,
} from './enums.js';
import { organizations, users } from './organization.js';

export const salesCheckpoints = pgTable(
  'sales_checkpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    businessDate: date('business_date', { mode: 'string' }).notNull(),
    period: salesCheckpointPeriodEnum('period').notNull(),
    status: salesCheckpointStatusEnum('status').notNull(),
    registeredByUserId: uuid('registered_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    note: text('note'),
    confirmedByUserId: uuid('confirmed_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    correctedByUserId: uuid('corrected_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    correctedAt: timestamp('corrected_at', { withTimezone: true }),
    correctionReason: text('correction_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
  ],
);

export const salesCheckpointItems = pgTable(
  'sales_checkpoint_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    checkpointId: uuid('checkpoint_id')
      .notNull()
      .references(() => salesCheckpoints.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    productKind: productKindEnum('product_kind').notNull(),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    presentationId: uuid('presentation_id').references(() => productPresentations.id, {
      onDelete: 'restrict',
    }),
    trayCount: integer('tray_count'),
    averageWeightPerTrayGrams: integer('average_weight_per_tray_grams'),
    estimatedWeightGrams: integer('estimated_weight_grams'),
    measuredWeightGrams: integer('measured_weight_grams'),
    weightBasis: salesCheckpointWeightBasisEnum('weight_basis').notNull(),
    sellingPriceAmountMinor: integer('selling_price_amount_minor').notNull(),
    sellingPriceBasis: productPriceBasisEnum('selling_price_basis').notNull(),
    sellingPriceCurrency: text('selling_price_currency').notNull(),
    estimatedSalesValueMinor: integer('estimated_sales_value_minor').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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
  ],
);
