/**
 * Branch: a physical business location with its own independent inventory.
 *
 * Every future operational row (purchase, stock movement, production, sales
 * checkpoint, closing) will also carry `organization_id`; keeping both columns
 * makes tenant safety explicit on every query instead of trusting a join.
 */

import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organization.js';

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('branches_organization_name_uq').on(table.organizationId, table.name),
    index('branches_organization_active_idx').on(table.organizationId, table.isActive),
  ],
);
