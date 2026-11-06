/**
 * Authentication and authorization — the pure rules.
 *
 * This module owns the vocabulary of "who is calling, what may they do" without
 * knowing anything about HTTP, cookies, tokens, hashing or databases. A session
 * here is a fact — this user, for this organization, with this role, valid until
 * this instant.
 */

import type { IsoDateTime, OrganizationId, SessionId, UserId } from '@inventory-u3/types';

import type { OrganizationRole } from './roles.js';
import { DomainError } from '../shared/errors.js';

/** A person who logs in to the organization. One user belongs to one organization. */
export interface AuthenticatedUser {
  readonly id: UserId;
  readonly organizationId: OrganizationId;
  readonly email: string;
  readonly fullName: string;
  readonly role: OrganizationRole;
  readonly isActive: boolean;
  readonly lastLoginAt?: IsoDateTime;
}

/**
 * A user plus the hash needed to verify a password.
 *
 * Kept separate from `AuthenticatedUser` so the hash is read once, at login, and
 * never travels with the user afterwards.
 */
export interface UserWithCredentials {
  readonly user: AuthenticatedUser;
  readonly passwordHash?: string;
}

/**
 * A session as the domain sees it.
 *
 * `tokenHash` is the hash of the bearer token, never the token itself.
 */
export interface Session {
  readonly id: SessionId;
  readonly tokenHash: string;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly issuedAt: IsoDateTime;
  readonly expiresAt: IsoDateTime;
  readonly revokedAt?: IsoDateTime;
}

/** The authenticated caller, as the request lifecycle needs it. */
export interface Principal {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly role: OrganizationRole;
}

export function principalFromUser(user: AuthenticatedUser): Principal {
  return { userId: user.id, organizationId: user.organizationId, role: user.role };
}

/** Whether an instant is strictly before a session's expiry. */
export function isSessionExpired(session: Session, now: IsoDateTime): boolean {
  return session.expiresAt <= now;
}

/**
 * Decide whether a session still stands at `now`.
 *
 * Refusals carry no detail beyond "not authenticated" so a caller cannot learn
 * whether a token was unknown, revoked or simply old.
 */
export function assertSessionUsable(session: Session | undefined, now: IsoDateTime): Session {
  if (!session || session.revokedAt !== undefined || isSessionExpired(session, now)) {
    throw new DomainError('UNAUTHENTICATED', 'The session is missing, revoked or expired');
  }
  return session;
}

/** A user must be active to be authenticated at all. */
export function assertUserActive(user: AuthenticatedUser): AuthenticatedUser {
  if (!user.isActive) {
    throw new DomainError('UNAUTHENTICATED', 'The account is not active');
  }
  return user;
}
