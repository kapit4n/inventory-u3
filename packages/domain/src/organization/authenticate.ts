/**
 * Authentication use cases — login, session resolution and logout.
 *
 * These are the only places a password is verified, a session is issued, or a
 * session is turned back into a principal. They are pure orchestration over the
 * ports: read the user, verify the password, mint a token, store its hash.
 */

import type { IsoDateTime, OrganizationId, UserId } from '@inventory-u3/types';
import { asSessionId } from '@inventory-u3/types';

import type { SessionRepository, UserRepository } from '../ports/index.js';
import type { Clock } from '../shared/clock.js';
import type { IdGenerator } from '../shared/id-generator.js';
import type { PasswordHasher, TokenGenerator } from '../shared/security.js';
import { DomainError } from '../shared/errors.js';
import {
  assertSessionUsable,
  assertUserActive,
  isSessionExpired,
  principalFromUser,
  type AuthenticatedUser,
  type Principal,
  type Session,
} from '../organization/auth.js';

/** Session lifetime, in hours. A working day, so a shift does not require re-login. */
export const DEFAULT_SESSION_TTL_HOURS = 12;

export interface AuthDependencies {
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
  readonly passwordHasher: PasswordHasher;
  readonly tokenGenerator: TokenGenerator;
  readonly clock: Clock;
  readonly ids: IdGenerator;
  readonly sessionTtlHours?: number;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface LoginResult {
  /** The plain bearer token. Returned exactly once; never stored in this form. */
  readonly token: string;
  readonly expiresAt: IsoDateTime;
  readonly user: AuthenticatedUser;
}

/**
 * The one message every failed login produces.
 *
 * Deliberately not parameterised by reason: "no such email", "wrong password"
 * and "deactivated" must be indistinguishable to a caller.
 */
const LOGIN_REFUSED_MESSAGE = 'The email or password is incorrect';

function addHours(iso: IsoDateTime, hours: number): IsoDateTime {
  const base = new Date(iso);
  base.setUTCHours(base.getUTCHours() + hours);
  return base.toISOString() as IsoDateTime;
}

/**
 * Verify credentials and issue a session.
 *
 * `findByEmailForLogin` decides existence; the hasher decides the password; the
 * domain decides whether the account may log in at all.
 */
export async function login(
  organizationId: OrganizationId,
  input: LoginInput,
  dependencies: AuthDependencies,
): Promise<LoginResult> {
  const { users, passwordHasher } = dependencies;

  const found = await users.findByEmailForLogin(organizationId, input.email);

  if (!found || found.passwordHash === undefined) {
    throw new DomainError('UNAUTHENTICATED', LOGIN_REFUSED_MESSAGE);
  }

  const passwordMatches = await passwordHasher.verify(input.password, found.passwordHash);
  if (!passwordMatches) {
    throw new DomainError('UNAUTHENTICATED', LOGIN_REFUSED_MESSAGE);
  }

  return issueSession(organizationId, assertUserActive(found.user), dependencies);
}

/**
 * Issue a session for a user who has already been identified, with no password.
 *
 * This exists for the development-only "sign in as" affordance (ADR 0030).
 */
export async function startSessionForUser(
  organizationId: OrganizationId,
  userId: UserId,
  dependencies: AuthDependencies,
): Promise<LoginResult> {
  const user = await dependencies.users.findById(organizationId, userId);
  if (!user) {
    throw new DomainError('UNAUTHENTICATED', 'The account no longer exists');
  }

  return issueSession(organizationId, assertUserActive(user), dependencies);
}

/** One place that mints a token, stores its hash and stamps the login. */
async function issueSession(
  organizationId: OrganizationId,
  user: AuthenticatedUser,
  dependencies: AuthDependencies,
): Promise<LoginResult> {
  const { users, sessions, tokenGenerator, clock, ids } = dependencies;
  const now = clock.now();

  const token = tokenGenerator.nextToken();
  const session: Session = {
    id: asSessionId(ids.nextId()),
    tokenHash: tokenGenerator.hashToken(token),
    userId: user.id,
    organizationId,
    issuedAt: now,
    expiresAt: addHours(now, dependencies.sessionTtlHours ?? DEFAULT_SESSION_TTL_HOURS),
  };

  await sessions.save(session);
  await users.recordLogin(organizationId, user.id, now);

  return { token, expiresAt: session.expiresAt, user };
}

/**
 * Turn a presented token into a principal, or refuse.
 *
 * Looks the session up by hash, then applies the domain's own usability rules
 * (not revoked, not expired) and the user's active flag.
 */
export async function resolvePrincipal(
  organizationId: OrganizationId,
  token: string,
  dependencies: AuthDependencies,
): Promise<Principal> {
  const { users, sessions, tokenGenerator, clock } = dependencies;

  const session = await sessions.findByTokenHash(tokenGenerator.hashToken(token));
  const usable = assertSessionUsable(session, clock.now());

  if (usable.organizationId !== organizationId) {
    throw new DomainError('UNAUTHENTICATED', 'The session does not belong to this organization');
  }

  const user = await users.findById(organizationId, usable.userId);
  if (!user) {
    throw new DomainError('UNAUTHENTICATED', 'The account no longer exists');
  }

  return principalFromUser(assertUserActive(user));
}

/** Revoke the presented session. Idempotent and silent: logging out twice is fine. */
export async function logout(
  token: string,
  dependencies: Pick<AuthDependencies, 'sessions' | 'tokenGenerator' | 'clock'>,
): Promise<void> {
  await dependencies.sessions.revoke(
    dependencies.tokenGenerator.hashToken(token),
    dependencies.clock.now(),
  );
}

export { isSessionExpired, type AuthenticatedUser, type Principal, type Session, type UserId };
