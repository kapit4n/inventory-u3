/**
 * Session persistence, on PostgreSQL.
 *
 * `findByTokenHash` does not filter out expired or revoked rows: expiry and
 * revocation are domain decisions (`assertSessionUsable`).
 */

import { eq } from 'drizzle-orm';

import { sessions } from '@inventory-u3/database/schema';
import type { Session, SessionRepository } from '@inventory-u3/domain';
import { asOrganizationId, asSessionId, asUserId, type IsoDateTime } from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type SessionRow = typeof sessions.$inferSelect;

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async save(session: Session): Promise<void> {
    await this.db.insert(sessions).values({
      id: session.id,
      tokenHash: session.tokenHash,
      userId: session.userId,
      organizationId: session.organizationId,
      issuedAt: new Date(session.issuedAt),
      expiresAt: new Date(session.expiresAt),
      revokedAt: session.revokedAt === undefined ? null : new Date(session.revokedAt),
    });
  }

  async findById(sessionId: string): Promise<Session | undefined> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

    return row ? toSession(row) : undefined;
  }

  async findByTokenHash(tokenHash: string): Promise<Session | undefined> {
    const [row] = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .limit(1);

    return row ? toSession(row) : undefined;
  }

  async revoke(tokenHash: string, at: IsoDateTime): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date(at) })
      .where(eq(sessions.tokenHash, tokenHash));
  }
}

function toSession(row: SessionRow): Session {
  return {
    id: asSessionId(row.id),
    tokenHash: row.tokenHash,
    userId: asUserId(row.userId),
    organizationId: asOrganizationId(row.organizationId),
    issuedAt: row.issuedAt.toISOString() as IsoDateTime,
    expiresAt: row.expiresAt.toISOString() as IsoDateTime,
    ...(row.revokedAt === null ? {} : { revokedAt: row.revokedAt.toISOString() as IsoDateTime }),
  };
}
