/**
 * Authentication, end to end on SQLite.
 *
 * Builds the real server through `buildServer`, so the auth plugin, the session
 * repository, the scrypt hasher and the error mapping are all exercised as the
 * process runs them.
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
const PASSWORD = DEVELOPMENT_PASSWORD;

describe('authentication (SQLite)', () => {
  let dir: string;
  let app: InventoryApiServer;
  let productionApp: InventoryApiServer;

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'inventory-auth-'));
    const databaseUrl = `sqlite:${path.join(dir, 'inventory.db')}`;

    const { db, client } = createSqliteConnection(databaseUrl);
    migrate(db, { migrationsFolder: path.join(here, '../../../database/migrations-sqlite') });
    await seed(db);
    client.close();

    const environment = {
      NODE_ENV: 'test',
      API_HOST: '127.0.0.1',
      API_PORT: '4001',
      LOG_LEVEL: 'silent',
      CORS_ORIGINS: 'http://localhost:5173',
      DATABASE_URL: databaseUrl,
      ORGANIZATION_ID: DEVELOPMENT_ORGANIZATION_ID,
      SESSION_TTL_HOURS: '12',
      AUTH_LOGIN_MAX_ATTEMPTS: '2',
      AUTH_LOGIN_WINDOW_MINUTES: '15',
    };

    app = await buildServer(environment);
    productionApp = await buildServer({ ...environment, NODE_ENV: 'production' });
  });

  afterAll(async () => {
    await productionApp?.close();
    await app?.close();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  async function login(email = 'admin@inventory.test', password = PASSWORD) {
    return app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email, password },
    });
  }

  it('refuses a protected route with no token', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/organization' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHENTICATED');
    expect(response.headers['www-authenticate']).toBe('Bearer');
  });

  it('refuses a malformed or unknown token', async () => {
    const malformed = await app.inject({
      method: 'GET',
      url: '/api/v1/organization',
      headers: { authorization: 'Basic abc' },
    });
    expect(malformed.statusCode).toBe(401);

    const unknown = await app.inject({
      method: 'GET',
      url: '/api/v1/organization',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(unknown.statusCode).toBe(401);
  });

  it('leaves the readiness probe reachable without a token', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(200);
  });

  it('logs in with the right password and returns a bearer token', async () => {
    const response = await login();
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.user.email).toBe('admin@inventory.test');
    expect(JSON.stringify(body)).not.toContain('scrypt$');
  });

  it('accepts the issued token on a protected route', async () => {
    const { token } = (await login()).json();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/organization',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(DEVELOPMENT_ORGANIZATION_ID);
  });

  it('refuses a wrong password and an unknown email identically', async () => {
    const wrong = await login('admin@inventory.test', 'wrong');
    const unknown = await login('nobody@inventory.test', PASSWORD);

    expect(wrong.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrong.json().error.code).toBe('UNAUTHENTICATED');
    expect(wrong.json().error.message).toBe(unknown.json().error.message);
  });

  it('is case-insensitive on the email', async () => {
    expect((await login('ADMIN@INVENTORY.TEST', PASSWORD)).statusCode).toBe(200);
  });

  it('revokes the token on logout', async () => {
    const { token } = (await login()).json();
    const auth = { authorization: `Bearer ${token}` };

    expect(
      (await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: auth })).statusCode,
    ).toBe(200);

    const loggedOut = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: auth,
    });
    expect(loggedOut.statusCode).toBe(204);

    const after = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: auth });
    expect(after.statusCode).toBe(401);
  });

  it('answers the current user on /auth/me', async () => {
    const { token } = (await login()).json();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user).toMatchObject({
      email: 'admin@inventory.test',
      role: 'ADMINISTRATOR',
    });
  });

  it('lets only an administrator change organization settings', async () => {
    const staff = (await login('staff@inventory.test')).json().token;
    const admin = (await login()).json().token;

    const forbidden = await app.inject({
      method: 'PUT',
      url: '/api/v1/organization',
      headers: { authorization: `Bearer ${staff}` },
      payload: { name: 'Wrong', timezone: 'UTC', currency: 'USD' },
    });
    expect(forbidden.statusCode).toBe(403);

    const allowed = await app.inject({
      method: 'PUT',
      url: '/api/v1/organization',
      headers: { authorization: `Bearer ${admin}` },
      payload: { name: 'Inventory Test Org', timezone: 'Europe/Madrid', currency: 'EUR' },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json()).toMatchObject({
      name: 'Inventory Test Org',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
    });
  });

  it('throttles repeated failures without touching another account', async () => {
    const email = 'limited@inventory.test';

    expect((await login(email, 'wrong')).statusCode).toBe(401);
    expect((await login(email, 'wrong')).statusCode).toBe(401);

    const throttled = await login(email, PASSWORD);
    expect(throttled.statusCode).toBe(429);
    expect(throttled.json().error.code).toBe('RATE_LIMITED');
    expect(Number(throttled.headers['retry-after'])).toBeGreaterThan(0);

    expect((await login('admin@inventory.test', PASSWORD)).statusCode).toBe(200);
  });

  it('does not expose the development chooser in production', async () => {
    const response = await productionApp.inject({
      method: 'GET',
      url: '/api/v1/auth/dev-users',
    });
    expect(response.statusCode).toBe(404);
  });
});

async function seed(db: ReturnType<typeof createSqliteConnection>['db']): Promise<void> {
  const passwordHash = await new ScryptPasswordHasher().hash(PASSWORD);

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
