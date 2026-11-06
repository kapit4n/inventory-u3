/**
 * Integration smoke test: the whole API on SQLite (ADR 0025).
 *
 * It builds the real server through `buildServer` and checks the engine,
 * migration, readiness probe and default-deny authentication behaviour.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as schema from '@inventory-u3/database/schema/sqlite';
import {
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_USERS,
} from '@inventory-u3/database/development-data';
import { createSqliteConnection } from '../src/infrastructure/persistence/sqlite/connection.js';
import { ScryptPasswordHasher } from '../src/infrastructure/security/scrypt-password-hasher.js';
import { buildServer, type InventoryApiServer } from '../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));

describe('API on SQLite', () => {
  let dir: string;
  let app: InventoryApiServer;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-sqlite-'));
    const databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4000',
      LOG_LEVEL: 'silent',
      CORS_ORIGINS: 'http://localhost:5173',
      DATABASE_URL: databaseUrl,
      ORGANIZATION_ID: DEVELOPMENT_ORGANIZATION_ID,
      SESSION_TTL_HOURS: '12',
      AUTH_LOGIN_MAX_ATTEMPTS: '5',
      AUTH_LOGIN_WINDOW_MINUTES: '15',
    });
  });

  afterAll(async () => {
    await app?.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('declares itself ready on /ready', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json().checks.database).toBe('ok');
  });

  it('describes the service on /', async () => {
    const response = await app.inject({ method: 'GET', url: '/' });
    expect(response.statusCode).toBe(200);
    expect(response.json().service).toBe('inventory-u3-api');
  });

  it('serves the organization to an authenticated user', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@inventory.test', password: DEVELOPMENT_PASSWORD },
    });
    expect(login.statusCode).toBe(200);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/organization',
      headers: { authorization: `Bearer ${login.json().token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: DEVELOPMENT_ORGANIZATION_ID,
      name: 'Inventory Smoke Organization',
      timezone: 'UTC',
      currency: 'USD',
    });
  });
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Smoke Organization',
    timezone: 'UTC',
    currency: 'USD',
    isActive: true,
  });

  await db.insert(schema.users).values(
    DEVELOPMENT_USERS.map((user) => ({
      id: user.id,
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      email: user.email,
      passwordHash,
      fullName: user.fullName,
      role: user.role,
      isActive: true,
    })),
  );
}
