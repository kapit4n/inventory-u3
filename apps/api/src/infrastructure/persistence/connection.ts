/**
 * The database connection seam — the engine is chosen by the URL scheme.
 *
 * Routes receive ports (`repositories`, `unitOfWork`), never a driver handle,
 * so nothing above this file has to know which engine answered.
 */

import type { Repositories, UnitOfWork } from '@inventory-u3/domain';

import { isSqliteUrl } from '@inventory-u3/database/db-url';
import { createPostgresConnection } from './postgres/connection.js';
import { DrizzleUnitOfWork, repositoriesFor } from './postgres/unit-of-work.js';
import { createSqliteConnection, type SqliteDatabase } from './sqlite/connection.js';
import { SQLiteUnitOfWork } from './sqlite/unit-of-work.js';
import { sqliteRepositoriesFor } from './sqlite/repositories.js';

export type DatabaseEngine = 'postgresql' | 'sqlite';

export interface DatabaseConnection {
  readonly engine: DatabaseEngine;
  readonly repositories: Repositories;
  readonly unitOfWork: UnitOfWork;
  /** `true` when the database answers — used by the readiness probe. */
  isReachable(): Promise<boolean>;
  close(): Promise<void> | void;
}

export function openDatabaseConnection(databaseUrl: string): DatabaseConnection {
  return isSqliteUrl(databaseUrl) ? openSqlite(databaseUrl) : openPostgres(databaseUrl);
}

function openPostgres(databaseUrl: string): DatabaseConnection {
  const { db, sql, close } = createPostgresConnection(databaseUrl);

  return {
    engine: 'postgresql',
    repositories: repositoriesFor(db),
    unitOfWork: new DrizzleUnitOfWork(db),
    isReachable: async () => {
      try {
        await sql`select 1`;
        return true;
      } catch {
        return false;
      }
    },
    close,
  };
}

function openSqlite(databaseUrl: string): DatabaseConnection {
  const { db, client, close } = createSqliteConnection(databaseUrl);

  return {
    engine: 'sqlite',
    repositories: sqliteRepositoriesFor(db),
    unitOfWork: new SQLiteUnitOfWork(client, db, sqliteRepositoriesFor),
    isReachable: () => {
      try {
        client.prepare('select 1').get();
        return Promise.resolve(true);
      } catch {
        return Promise.resolve(false);
      }
    },
    close,
  };
}

export type { SqliteDatabase };
export type { InventoryDatabase } from './postgres/connection.js';
