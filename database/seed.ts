/**
 * Development seed data, on both engines (ADR 0025).
 *
 * Idempotent: every insert is keyed by a fixed id, so running the seed twice
 * leaves the same records. It never runs against a production-looking URL.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import Database from 'better-sqlite3';
import { drizzle as sqliteDrizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { isSqliteUrl, sqliteDatabasePath, ensureSqliteDatabaseDirectory } from './db-url.js';

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as pgSchema from '@inventory-u3/database/schema';
import * as sqliteSchema from '@inventory-u3/database/schema/sqlite';
import {
  DEVELOPMENT_CURRENCY,
  DEVELOPMENT_ORGANIZATION_ID,
  DEVELOPMENT_ORGANIZATION_NAME,
  DEVELOPMENT_PASSWORD,
  DEVELOPMENT_TIMEZONE,
  DEVELOPMENT_USERS,
} from './development-data.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Copy .env.example to .env first.');
  process.exit(78);
}

if (databaseUrl.includes('prod') && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('Refusing to seed a database whose URL looks like production.');
  process.exit(78);
}

const timezone = DEVELOPMENT_TIMEZONE;
const currency = DEVELOPMENT_CURRENCY;

async function hashPassword(password: string): Promise<string> {
  const { randomBytes, scrypt } = await import('node:crypto');
  const { promisify } = await import('node:util');
  const scryptAsync = promisify(scrypt) as (
    password: string,
    salt: Buffer,
    keylen: number,
    options: { N: number; r: number; p: number; maxmem: number },
  ) => Promise<Buffer>;
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return ['scrypt', 16384, 8, 1, salt.toString('base64'), derived.toString('base64')].join('$');
}

async function seedPostgres(db: PostgresJsDatabase<typeof pgSchema>): Promise<void> {
  const { organizations, users } = pgSchema;
  const passwordHash = await hashPassword(DEVELOPMENT_PASSWORD);

  await db
    .insert(organizations)
    .values({
      id: DEVELOPMENT_ORGANIZATION_ID,
      name: DEVELOPMENT_ORGANIZATION_NAME,
      timezone,
      currency,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: DEVELOPMENT_ORGANIZATION_NAME,
        timezone,
        currency,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  for (const user of DEVELOPMENT_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          passwordHash,
          fullName: user.fullName,
          role: user.role,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }
}

async function seedSqlite(db: BetterSQLite3Database<typeof sqliteSchema>): Promise<void> {
  const { organizations, users } = sqliteSchema;
  const passwordHash = await hashPassword(DEVELOPMENT_PASSWORD);

  await db
    .insert(organizations)
    .values({
      id: DEVELOPMENT_ORGANIZATION_ID,
      name: DEVELOPMENT_ORGANIZATION_NAME,
      timezone,
      currency,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: organizations.id,
      set: {
        name: DEVELOPMENT_ORGANIZATION_NAME,
        timezone,
        currency,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  for (const user of DEVELOPMENT_USERS) {
    await db
      .insert(users)
      .values({
        id: user.id,
        organizationId: DEVELOPMENT_ORGANIZATION_ID,
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: user.email,
          passwordHash,
          fullName: user.fullName,
          role: user.role,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }
}

if (isSqliteUrl(databaseUrl)) {
  ensureSqliteDatabaseDirectory(databaseUrl);
  const client = new Database(sqliteDatabasePath(databaseUrl));
  client.pragma('foreign_keys = ON');
  const db = sqliteDrizzle(client, { schema: sqliteSchema, casing: 'snake_case' });

  try {
    await seedSqlite(db);
    console.log(`Seeded SQLite organization ${DEVELOPMENT_ORGANIZATION_ID}`);
    console.log(`Development users: ${DEVELOPMENT_USERS.map((user) => user.email).join(', ')}`);
    console.log(`Password: ${DEVELOPMENT_PASSWORD}`);
  } finally {
    client.close();
  }
} else {
  const sql = postgres(databaseUrl, { max: 1 });
  const db = drizzle(sql, { schema: pgSchema, casing: 'snake_case' });

  try {
    await seedPostgres(db);
    console.log(`Seeded PostgreSQL organization ${DEVELOPMENT_ORGANIZATION_ID}`);
    console.log(`Development users: ${DEVELOPMENT_USERS.map((user) => user.email).join(', ')}`);
    console.log(`Password: ${DEVELOPMENT_PASSWORD}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}
