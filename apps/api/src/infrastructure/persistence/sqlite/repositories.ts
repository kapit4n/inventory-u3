import type { Repositories } from '@inventory-u3/domain';

import type { SqliteDatabase } from './connection.js';
import { SQLiteBranchRepository } from './repositories/branch-repository.js';
import { SQLiteOrganizationRepository } from './repositories/organization-repository.js';
import { SQLiteSessionRepository } from './repositories/session-repository.js';
import { SQLiteUserRepository } from './repositories/user-repository.js';

export function sqliteRepositoriesFor(db: SqliteDatabase): Repositories {
  return {
    organizations: new SQLiteOrganizationRepository(db),
    branches: new SQLiteBranchRepository(db),
    users: new SQLiteUserRepository(db),
    sessions: new SQLiteSessionRepository(db),
  };
}
