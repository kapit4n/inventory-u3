/**
 * Domain ports — the interfaces the outside world must satisfy.
 *
 * The domain declares these; infrastructure implements them. That inversion keeps
 * `packages/domain` free of Drizzle, PostgreSQL, HTTP and React: the domain says
 * what it needs, never how it is stored or transported.
 */

import type { BranchId, IsoDateTime, OrganizationId, SessionId, UserId } from '@inventory-u3/types';

import type { Branch } from '../branch/branch.js';
import type { AuthenticatedUser, Session, UserWithCredentials } from '../organization/auth.js';
import type { Organization, OrganizationSettingsUpdate } from '../organization/organization.js';

export interface UnitOfWork {
  transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}

/**
 * What one transaction is handed.
 *
 * This set grows only when an implementation exists in both engines. Keeping a
 * name here that no engine can build is a promise the code cannot keep.
 */
export interface Repositories {
  readonly organizations: OrganizationRepository;
  readonly branches: BranchRepository;
  readonly users: UserRepository;
  readonly sessions: SessionRepository;
}

export interface OrganizationRepository {
  findById(organizationId: OrganizationId): Promise<Organization | undefined>;
  updateSettings(
    organizationId: OrganizationId,
    settings: OrganizationSettingsUpdate,
  ): Promise<Organization | undefined>;
  getDefault(): Promise<Organization | undefined>;
}

export interface BranchRepository {
  findById(organizationId: OrganizationId, branchId: BranchId): Promise<Branch | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly Branch[]>;
  create(branch: Branch): Promise<Branch>;
}

export interface UserRepository {
  findById(organizationId: OrganizationId, userId: UserId): Promise<AuthenticatedUser | undefined>;
  findByEmailForLogin(
    organizationId: OrganizationId,
    email: string,
  ): Promise<UserWithCredentials | undefined>;
  listByOrganization(organizationId: OrganizationId): Promise<readonly AuthenticatedUser[]>;
  recordLogin(organizationId: OrganizationId, userId: UserId, at: IsoDateTime): Promise<void>;
}

export interface SessionRepository {
  findById(sessionId: SessionId): Promise<Session | undefined>;
  findByTokenHash(tokenHash: string): Promise<Session | undefined>;
  save(session: Session): Promise<void>;
  revoke(tokenHash: string, at: IsoDateTime): Promise<void>;
}
