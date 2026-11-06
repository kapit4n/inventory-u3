import { describe, expect, it } from 'vitest';
import { ConfigurationError, loadApiConfig, type EnvSource } from '../src/config/env.js';

const VALID_ENV: EnvSource = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: '4000',
  LOG_LEVEL: 'silent',
  CORS_ORIGINS: 'http://localhost:5173, http://localhost:5174',
  DATABASE_URL: 'sqlite:./data/inventory-test.db',
  ORGANIZATION_ID: '11111111-1111-4111-8111-111111111111',
  SESSION_TTL_HOURS: '12',
  AUTH_LOGIN_MAX_ATTEMPTS: '5',
  AUTH_LOGIN_WINDOW_MINUTES: '15',
};

describe('loadApiConfig', () => {
  it('maps a valid environment into a frozen config', () => {
    const config = loadApiConfig(VALID_ENV);

    expect(config.nodeEnv).toBe('test');
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(4000);
    expect(config.organizationId).toBe('11111111-1111-4111-8111-111111111111');
    expect(config.sessionTtlHours).toBe(12);
    expect(config.corsOrigins).toEqual(['http://localhost:5173', 'http://localhost:5174']);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('refuses to boot without a DATABASE_URL', () => {
    expect(() => loadApiConfig({ ...VALID_ENV, DATABASE_URL: undefined })).toThrow(
      ConfigurationError,
    );
  });

  it('refuses to boot without an ORGANIZATION_ID', () => {
    expect(() => loadApiConfig({ ...VALID_ENV, ORGANIZATION_ID: undefined })).toThrow(
      ConfigurationError,
    );
  });

  it('rejects an ORGANIZATION_ID that is not a UUID', () => {
    expect(() => loadApiConfig({ ...VALID_ENV, ORGANIZATION_ID: 'not-a-uuid' })).toThrow(
      /ORGANIZATION_ID/,
    );
  });

  it('rejects a connection string for a database that is not PostgreSQL or SQLite', () => {
    expect(() => loadApiConfig({ ...VALID_ENV, DATABASE_URL: 'mysql://host/db' })).toThrow(
      /DATABASE_URL must be a postgres:\/\/ or sqlite:\/file: URL/,
    );
  });

  it('rejects an out-of-range port instead of binding to it later', () => {
    expect(() => loadApiConfig({ ...VALID_ENV, API_PORT: '70000' })).toThrow(ConfigurationError);
  });

  it('pretty-prints only in development', () => {
    expect(
      loadApiConfig({ ...VALID_ENV, NODE_ENV: 'development', LOG_LEVEL: 'debug' }).logPretty,
    ).toBe(true);
    expect(
      loadApiConfig({ ...VALID_ENV, NODE_ENV: 'production', LOG_LEVEL: 'debug' }).logPretty,
    ).toBe(false);
    expect(
      loadApiConfig({ ...VALID_ENV, NODE_ENV: 'development', LOG_LEVEL: 'silent' }).logPretty,
    ).toBe(false);
  });
});
