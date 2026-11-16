/**
 * Production batches and their input, output and waste lines.
 *
 * A batch is branch-scoped and audited: the preparer is an employee, the
 * registrar is an application user, and confirmation/correction keep their own
 * actor and timestamp. Output weight assumptions are copied into the line so
 * later catalog edits cannot change history.
 */

import { date, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { measurementUnits, products, productPresentations } from './catalog.js';
import { employees } from './employee.js';
import { productionStatusEnum, productionWeightBasisEnum } from './enums.js';
import { organizations, users } from './organization.js';

export const productionBatches = pgTable(
  'production_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    businessDate: date('business_date', { mode: 'string' }).notNull(),
    preparedByEmployeeId: uuid('prepared_by_employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'restrict' }),
    registeredByUserId: uuid('registered_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: productionStatusEnum('status').notNull(),
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
    index('production_batches_organization_business_date_idx').on(
      table.organizationId,
      table.businessDate,
      table.createdAt,
    ),
    index('production_batches_organization_branch_idx').on(table.organizationId, table.branchId),
    index('production_batches_organization_employee_idx').on(
      table.organizationId,
      table.preparedByEmployeeId,
    ),
    index('production_batches_organization_status_idx').on(table.organizationId, table.status),
  ],
);

export const productionInputs = pgTable(
  'production_inputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    unitId: uuid('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('production_inputs_organization_batch_idx').on(table.organizationId, table.batchId),
    index('production_inputs_organization_product_idx').on(table.organizationId, table.productId),
  ],
);

export const productionOutputs = pgTable(
  'production_outputs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    presentationId: uuid('presentation_id')
      .notNull()
      .references(() => productPresentations.id, { onDelete: 'restrict' }),
    trayCount: integer('tray_count').notNull(),
    averageWeightPerTrayGrams: integer('average_weight_per_tray_grams').notNull(),
    estimatedWeightGrams: integer('estimated_weight_grams').notNull(),
    measuredWeightGrams: integer('measured_weight_grams'),
    weightBasis: productionWeightBasisEnum('weight_basis').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('production_outputs_organization_batch_idx').on(table.organizationId, table.batchId),
    index('production_outputs_organization_product_idx').on(table.organizationId, table.productId),
  ],
);

export const productionWaste = pgTable(
  'production_waste',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('production_waste_organization_batch_idx').on(table.organizationId, table.batchId),
    index('production_waste_organization_product_idx').on(table.organizationId, table.productId),
  ],
);
