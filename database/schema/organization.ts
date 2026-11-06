/**
 * Organization: the tenant, its users and their login sessions.
 *
 * Multi-organization is designed for from day one: every future inventory row
 * carries `organization_id`, and every read is scoped by it.
 */

import { relations } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { organizationRoleEnum } from './enums.js';

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  /** IANA zone, e.g. `America/Lima`. */
  timezone: text('timezone').notNull().default('UTC'),
  /** ISO-4217 code, stored once per tenant. */
  currency: text('currency').notNull().default('USD'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    fullName: text('full_name').notNull(),
    role: organizationRoleEnum('role').notNull().default('STAFF'),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_organization_email_uq').on(table.organizationId, table.email),
    index('users_organization_role_idx').on(table.organizationId, table.role),
  ],
);

/**
 * Login sessions, one row per issued token.
 *
 * The column is `token_hash`, never the token: a database dump cannot be
 * replayed against the API.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tokenHash: text('token_hash').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_uq').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
  ],
);

export const organizationRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  sessions: many(sessions),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  sessions: many(sessions),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  organization: one(organizations, {
    fields: [sessions.organizationId],
    references: [organizations.id],
  }),
}));
