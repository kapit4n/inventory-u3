/**
 * Organization: the SQLite twin of `database/schema/organization.ts`.
 *
 * Differences, all forced by SQLite rather than chosen:
 *
 *  - `uuid` is `text`; ids come from the application's `IdGenerator`.
 *  - timestamps are epoch milliseconds, UTC.
 *  - the role is `text` with a `CHECK` carrying the domain value list.
 */

import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import { ORGANIZATION_ROLES } from '@inventory-u3/domain';

import { nowDefault, uuidDefault } from './defaults.js';
import { enumCheck } from './enum-check.js';

export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey().default(uuidDefault),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  currency: text('currency').notNull().default('USD'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
});

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey().default(uuidDefault),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    fullName: text('full_name').notNull(),
    role: text('role', { enum: ORGANIZATION_ROLES }).notNull().default('STAFF'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
  },
  (table) => [
    uniqueIndex('users_organization_email_uq').on(table.organizationId, table.email),
    index('users_organization_role_idx').on(table.organizationId, table.role),
    enumCheck('users_role_in_values', 'role', ORGANIZATION_ROLES),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey().default(uuidDefault),
    tokenHash: text('token_hash').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    issuedAt: integer('issued_at', { mode: 'timestamp_ms' }).notNull().default(nowDefault),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_uq').on(table.tokenHash),
    index('sessions_user_idx').on(table.userId),
  ],
);
