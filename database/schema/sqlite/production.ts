import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { PRODUCTION_STATUSES, PRODUCTION_WEIGHT_BASES } from '@inventory-u3/domain';

import { branches } from './branch.js';
import { measurementUnits, products, productPresentations } from './catalog.js';
import { nowDefault, uuidDefault } from './defaults.js';
import { employees } from './employee.js';
import { enumCheck } from './enum-check.js';
import { organizations, users } from './organization.js';

export const productionBatches = sqliteTable(
  'production_batches',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    businessDate: text('business_date').notNull(),
    preparedByEmployeeId: text('prepared_by_employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'restrict' }),
    registeredByUserId: text('registered_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    status: text('status', { enum: PRODUCTION_STATUSES }).notNull(),
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
    enumCheck('production_batches_status_in_values', 'status', PRODUCTION_STATUSES),
  ],
);

export const productionInputs = sqliteTable(
  'production_inputs',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    batchId: text('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    unitId: text('unit_id')
      .notNull()
      .references(() => measurementUnits.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('production_inputs_organization_batch_idx').on(table.organizationId, table.batchId),
    index('production_inputs_organization_product_idx').on(table.organizationId, table.productId),
  ],
);

export const productionOutputs = sqliteTable(
  'production_outputs',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    batchId: text('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    presentationId: text('presentation_id')
      .notNull()
      .references(() => productPresentations.id, { onDelete: 'restrict' }),
    trayCount: integer('tray_count').notNull(),
    averageWeightPerTrayGrams: integer('average_weight_per_tray_grams').notNull(),
    estimatedWeightGrams: integer('estimated_weight_grams').notNull(),
    measuredWeightGrams: integer('measured_weight_grams'),
    weightBasis: text('weight_basis', { enum: PRODUCTION_WEIGHT_BASES }).notNull(),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('production_outputs_organization_batch_idx').on(table.organizationId, table.batchId),
    index('production_outputs_organization_product_idx').on(table.organizationId, table.productId),
    enumCheck('production_outputs_weight_basis_in_values', 'weight_basis', PRODUCTION_WEIGHT_BASES),
  ],
);

export const productionWaste = sqliteTable(
  'production_waste',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    batchId: text('batch_id')
      .notNull()
      .references(() => productionBatches.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    quantityMilli: integer('quantity_milli').notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    position: integer('position').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('production_waste_organization_batch_idx').on(table.organizationId, table.batchId),
    index('production_waste_organization_product_idx').on(table.organizationId, table.productId),
  ],
);
