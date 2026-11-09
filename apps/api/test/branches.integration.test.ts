/**
 * Branch routes, end to end on SQLite.
 *
 * The real server is built so the auth plugin, permissions, Zod validation,
 * domain rules and repository all run exactly as they do in the process.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
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

describe('branch routes (SQLite)', () => {
  let dir: string;
  let app: InventoryApiServer;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-branches-api-'));
    const databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4002',
      LOG_LEVEL: 'silent',
      CORS_ORIGINS: 'http://localhost:5173',
      DATABASE_URL: databaseUrl,
      ORGANIZATION_ID: DEVELOPMENT_ORGANIZATION_ID,
      SESSION_TTL_HOURS: '12',
      AUTH_LOGIN_MAX_ATTEMPTS: '100',
      AUTH_LOGIN_WINDOW_MINUTES: '15',
    });
  });

  afterAll(async () => {
    await app?.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  async function tokenFor(email: string): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password: DEVELOPMENT_PASSWORD },
    });
    return response.json().token as string;
  }

  function auth(token: string): { authorization: string } {
    return { authorization: `Bearer ${token}` };
  }

  it('lists branches for a reader', async () => {
    const token = await tokenFor('staff@inventory.test');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/branches',
      headers: auth(token),
    });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().items)).toBe(true);
  });

  it('does not let a non-administrator create a branch', async () => {
    const token = await tokenFor('manager@inventory.test');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/branches',
      headers: auth(token),
      payload: { name: 'Forbidden Branch' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('creates a branch with a trimmed name and lists it', async () => {
    const token = await tokenFor('admin@inventory.test');
    const name = `Central ${randomUUID()}`;

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/branches',
      headers: auth(token),
      payload: { name: `  ${name}  ` },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      name,
      isActive: true,
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/branches',
      headers: auth(token),
    });
    expect(listed.json().items).toContainEqual(created.json());
  });

  it('rejects a duplicate branch name without leaking a database error', async () => {
    const token = await tokenFor('admin@inventory.test');
    const name = `Duplicate ${randomUUID()}`;

    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/branches',
          headers: auth(token),
          payload: { name },
        })
      ).statusCode,
    ).toBe(201);

    const duplicate = await app.inject({
      method: 'POST',
      url: '/api/v1/branches',
      headers: auth(token),
      payload: { name },
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json().error.code).toBe('DOMAIN_RULE_VIOLATION');
  });

  it('renames and deactivates a branch', async () => {
    const token = await tokenFor('admin@inventory.test');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/branches',
      headers: auth(token),
      payload: { name: `North ${randomUUID()}` },
    });
    const branch = created.json();
    const renamed = `North Renamed ${randomUUID()}`;

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/branches/${branch.id}`,
      headers: auth(token),
      payload: { name: renamed, isActive: false },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: branch.id,
      name: renamed,
      isActive: false,
      createdAt: branch.createdAt,
      updatedAt: expect.any(String),
    });
  });

  it('returns not found for an unknown branch', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/branches/${randomUUID()}`,
      headers: auth(token),
      payload: { name: 'Missing Branch', isActive: true },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('rejects an empty branch body with the standard validation envelope', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/branches',
      headers: auth(token),
      payload: { name: '   ' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(response.json().error.details.issues)).toBe(true);
  });
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(DEVELOPMENT_PASSWORD);

  await db.insert(schema.organizations).values({
    id: DEVELOPMENT_ORGANIZATION_ID,
    name: 'Inventory Test Organization',
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
