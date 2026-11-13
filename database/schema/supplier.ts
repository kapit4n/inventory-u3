/**
 * Supplier: an organization-wide provider of products delivered to branches.
 *
 * The supplier is deliberately not branch-owned because the same provider can
 * deliver to several branches. Purchases in M3 carry the branch.
 */

import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { organizations } from './organization.js';

export const suppliers = pgTable(
  'suppliers',
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
  (table) => [index('suppliers_organization_active_idx').on(table.organizationId, table.isActive)],
);
