/**
 * Supplier: the SQLite twin of `database/schema/supplier.ts`.
 *
 * Differences, all forced by SQLite rather than chosen:
 *
 *  - `uuid` is `text`; ids come from the application's `IdGenerator`.
 *  - timestamps are epoch milliseconds, UTC.
 *  - the active flag is an integer with boolean mode.
 */

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { nowDefault, uuidDefault } from './defaults.js';
import { organizations } from './organization.js';

export const suppliers = sqliteTable(
  'suppliers',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [index('suppliers_organization_active_idx').on(table.organizationId, table.isActive)],
);
