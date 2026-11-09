/**
 * Employee: a person whose work is recorded, not an application user.
 *
 * An employee belongs to one branch so production can name the preparer. The
 * organization is stored alongside the branch so every read can enforce the
 * tenant boundary without trusting the branch reference.
 */

import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { branches } from './branch.js';
import { organizations } from './organization.js';

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('employees_organization_branch_active_idx').on(
      table.organizationId,
      table.branchId,
      table.isActive,
    ),
  ],
);
