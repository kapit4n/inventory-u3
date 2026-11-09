/**
 * Employee: the SQLite twin of `database/schema/employee.ts`.
 *
 * Differences, all forced by SQLite rather than chosen:
 *
 *  - `uuid` is `text`; ids come from the application's `IdGenerator`.
 *  - timestamps are epoch milliseconds, UTC.
 *  - the active flag is an integer with boolean mode.
 */

import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { branches } from './branch.js';
import { nowDefault, uuidDefault } from './defaults.js';
import { organizations } from './organization.js';

export const employees = sqliteTable(
  'employees',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    index('employees_organization_branch_active_idx').on(
      table.organizationId,
      table.branchId,
      table.isActive,
    ),
  ],
);
