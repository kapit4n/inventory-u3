/**
 * User persistence, on SQLite — the twin of
 * `repositories/user-repository.ts`.
 */

import { and, asc, eq, sql } from 'drizzle-orm';

import { users } from '@inventory-u3/database/schema/sqlite';
import type {
  AuthenticatedUser,
  OrganizationRole,
  UserRepository,
  UserWithCredentials,
} from '@inventory-u3/domain';
import {
  asOrganizationId,
  asUserId,
  type IsoDateTime,
  type OrganizationId,
  type UserId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type UserRow = typeof users.$inferSelect;

export class SQLiteUserRepository implements UserRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findByEmailForLogin(
    organizationId: OrganizationId,
    email: string,
  ): Promise<UserWithCredentials | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(
        and(eq(users.organizationId, organizationId), sql`lower(${users.email}) = lower(${email})`),
      )
      .limit(1);

    if (!row) {
      return undefined;
    }

    return {
      user: toUser(row),
      ...(row.passwordHash === null ? {} : { passwordHash: row.passwordHash }),
    };
  }

  async findById(
    organizationId: OrganizationId,
    userId: UserId,
  ): Promise<AuthenticatedUser | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.organizationId, organizationId), eq(users.id, userId)))
      .limit(1);

    return row ? toUser(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly AuthenticatedUser[]> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.organizationId, organizationId))
      .orderBy(asc(users.fullName));

    return rows.map(toUser);
  }

  async recordLogin(
    organizationId: OrganizationId,
    userId: UserId,
    at: IsoDateTime,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(at) })
      .where(and(eq(users.organizationId, organizationId), eq(users.id, userId)));
  }
}

function toUser(row: UserRow): AuthenticatedUser {
  return {
    id: asUserId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    email: row.email,
    fullName: row.fullName,
    role: row.role as OrganizationRole,
    isActive: row.isActive,
    ...(row.lastLoginAt === null
      ? {}
      : { lastLoginAt: row.lastLoginAt.toISOString() as IsoDateTime }),
  };
}
