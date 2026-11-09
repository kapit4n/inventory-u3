/**
 * Employee routes, end to end on SQLite.
 *
 * The real server is built so auth, permissions, validation, branch membership
 * checks and persistence run exactly as they do in the process.
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

describe('employee routes (SQLite)', () => {
  let dir: string;
  let app: InventoryApiServer;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-employees-api-'));
    const databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    app = await buildServer({
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4003',
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

  async function createBranch(token: string, name = `Branch ${randomUUID()}`): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/branches',
      headers: auth(token),
      payload: { name },
    });
    expect(response.statusCode).toBe(201);
    return response.json().id as string;
  }

  it('lists employees for a reader', async () => {
    const token = await tokenFor('staff@inventory.test');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/employees',
      headers: auth(token),
    });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().items)).toBe(true);
  });

  it('does not let a non-administrator create an employee', async () => {
    const token = await tokenFor('manager@inventory.test');
    const admin = await tokenFor('admin@inventory.test');
    const branchId = await createBranch(admin);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/employees',
      headers: auth(token),
      payload: { branchId, fullName: 'Forbidden Employee' },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().error.code).toBe('FORBIDDEN');
  });

  it('creates an employee with a trimmed name and lists it with its branch', async () => {
    const token = await tokenFor('admin@inventory.test');
    const branchId = await createBranch(token);
    const fullName = `Maria ${randomUUID()}`;

    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/employees',
      headers: auth(token),
      payload: { branchId, fullName: `  ${fullName}  ` },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organizationId: DEVELOPMENT_ORGANIZATION_ID,
      branchId,
      fullName,
      isActive: true,
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/v1/employees',
      headers: auth(token),
    });
    expect(listed.json().items).toContainEqual(created.json());
  });

  it('allows two employees to share the same full name', async () => {
    const token = await tokenFor('admin@inventory.test');
    const branchId = await createBranch(token);
    const fullName = `Maria Lopez ${randomUUID()}`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/employees',
        headers: auth(token),
        payload: { branchId, fullName },
      });
      expect(response.statusCode).toBe(201);
    }
  });

  it('rejects a branch from outside the organization with the validation envelope', async () => {
    const token = await tokenFor('admin@inventory.test');

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/employees',
      headers: auth(token),
      payload: { branchId: randomUUID(), fullName: 'Unknown Branch Employee' },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('renames, reassigns and deactivates an employee', async () => {
    const token = await tokenFor('admin@inventory.test');
    const originalBranch = await createBranch(token);
    const newBranch = await createBranch(token);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/employees',
      headers: auth(token),
      payload: { branchId: originalBranch, fullName: `Ana ${randomUUID()}` },
    });
    const employee = created.json();
    const renamed = `Ana Renamed ${randomUUID()}`;

    const updated = await app.inject({
      method: 'PUT',
      url: `/api/v1/employees/${employee.id}`,
      headers: auth(token),
      payload: { branchId: newBranch, fullName: renamed, isActive: false },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: employee.id,
      branchId: newBranch,
      fullName: renamed,
      isActive: false,
      createdAt: employee.createdAt,
      updatedAt: expect.any(String),
    });
  });

  it('returns not found for an unknown employee', async () => {
    const token = await tokenFor('admin@inventory.test');
    const branchId = await createBranch(token);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/employees/${randomUUID()}`,
      headers: auth(token),
      payload: { branchId, fullName: 'Missing Employee', isActive: true },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('rejects an empty employee body with the standard validation envelope', async () => {
    const token = await tokenFor('admin@inventory.test');
    const branchId = await createBranch(token);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/employees',
      headers: auth(token),
      payload: { branchId, fullName: '   ' },
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
