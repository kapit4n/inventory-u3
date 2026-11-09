import type { Repositories, UnitOfWork } from '@inventory-u3/domain';

import type { InventoryDatabase } from './connection.js';
import { DrizzleBranchRepository } from '../repositories/branch-repository.js';
import { DrizzleOrganizationRepository } from '../repositories/organization-repository.js';
import { DrizzleSessionRepository } from '../repositories/session-repository.js';
import { DrizzleUserRepository } from '../repositories/user-repository.js';

export function repositoriesFor(db: InventoryDatabase): Repositories {
  return {
    organizations: new DrizzleOrganizationRepository(db),
    branches: new DrizzleBranchRepository(db),
    users: new DrizzleUserRepository(db),
    sessions: new DrizzleSessionRepository(db),
  };
}

/**
 * A `UnitOfWork` whose transactions are PostgreSQL transactions.
 *
 * The repositories are built per transaction so none of them can escape it.
 */
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly db: InventoryDatabase) {}

  async transaction<T>(work: (repositories: Repositories) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => work(repositoriesFor(tx as InventoryDatabase)));
  }
}
