/**
 * The Fastify server factory.
 *
 * Exported separately from `main.ts` so tests can build a fully configured
 * server without opening a port: `buildServer()` returns an instance that is
 * ready to `.inject()` requests but has not called `.listen()`.
 */

import Fastify, { type FastifyInstance } from 'fastify';

import { loadApiConfig, type ApiConfig, type EnvSource } from './config/env.js';
import { loggerOptions } from './config/logger.js';
import {
  openDatabaseConnection,
  type DatabaseConnection,
} from './infrastructure/persistence/connection.js';
import { registerCors } from './http/plugins/cors.js';
import { registerAuth } from './http/plugins/auth.js';
import { registerAuthRoutes } from './http/routes/auth.js';
import { registerBranchRoutes } from './http/routes/branches.js';
import { registerEmployeeRoutes } from './http/routes/employees.js';
import { registerDevAuthRoutes } from './http/routes/dev-auth.js';
import { registerHealthRoutes } from './http/routes/health.js';
import { registerMeasurementUnitRoutes } from './http/routes/measurement-units.js';
import { registerOrganizationRoutes } from './http/routes/organization.js';
import { registerProductCategoryRoutes } from './http/routes/product-categories.js';
import { registerProductPresentationRoutes } from './http/routes/product-presentations.js';
import { registerProductPriceHistoryRoutes } from './http/routes/product-price-history.js';
import { registerProductRoutes } from './http/routes/products.js';
import { registerSupplierRoutes } from './http/routes/suppliers.js';
import { systemClock } from './infrastructure/clock/system-clock.js';
import { uuidGenerator } from './infrastructure/id/uuid-generator.js';
import { LoginRateLimiter } from './infrastructure/security/login-rate-limiter.js';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher.js';
import { CryptoTokenGenerator } from './infrastructure/security/token-generator.js';
import { sendProblem } from './http/problem.js';

export interface ServerDependencies {
  readonly config: ApiConfig;
  readonly connection: DatabaseConnection;
}

export type InventoryApiServer = FastifyInstance;

export async function buildServer(env: EnvSource = process.env): Promise<InventoryApiServer> {
  const config = loadApiConfig(env);
  const connection = openDatabaseConnection(config.databaseUrl);

  const app = Fastify({
    logger: loggerOptions(config),
    trustProxy: false,
    bodyLimit: 1_048_576,
  });

  app.setErrorHandler((error, request, reply) => sendProblem(reply, request, error));

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `No route matches ${request.method} ${request.url}`,
        requestId: request.id,
      },
    }),
  );

  await registerCors(app, config);
  await registerHealthRoutes(app, { config, connection });

  const auth = {
    users: connection.repositories.users,
    sessions: connection.repositories.sessions,
    passwordHasher: new ScryptPasswordHasher(),
    tokenGenerator: new CryptoTokenGenerator(),
    clock: systemClock,
    ids: uuidGenerator,
    sessionTtlHours: config.sessionTtlHours,
  };
  await registerAuth(app, { config, auth });

  const loginRateLimiter = new LoginRateLimiter({
    maxAttempts: config.loginMaxAttempts,
    windowMs: config.loginWindowMinutes * 60_000,
  });
  await registerAuthRoutes(app, {
    auth,
    organizationId: config.organizationId,
    loginRateLimiter,
  });

  if (config.nodeEnv !== 'production') {
    await registerDevAuthRoutes(app, { auth, organizationId: config.organizationId });
  }

  await registerOrganizationRoutes(app, {
    organizations: connection.repositories.organizations,
  });

  await registerBranchRoutes(app, {
    branches: connection.repositories.branches,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerEmployeeRoutes(app, {
    employees: connection.repositories.employees,
    branches: connection.repositories.branches,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerSupplierRoutes(app, {
    suppliers: connection.repositories.suppliers,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerProductCategoryRoutes(app, {
    productCategories: connection.repositories.productCategories,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerMeasurementUnitRoutes(app, {
    measurementUnits: connection.repositories.measurementUnits,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerProductRoutes(app, {
    products: connection.repositories.products,
    productCategories: connection.repositories.productCategories,
    measurementUnits: connection.repositories.measurementUnits,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerProductPresentationRoutes(app, {
    productPresentations: connection.repositories.productPresentations,
    products: connection.repositories.products,
    clock: systemClock,
    ids: uuidGenerator,
  });

  await registerProductPriceHistoryRoutes(app, {
    productPriceHistory: connection.repositories.productPriceHistory,
    products: connection.repositories.products,
    organizations: connection.repositories.organizations,
    clock: systemClock,
    ids: uuidGenerator,
  });

  app.get('/', { config: { public: true } }, async () => ({
    service: 'inventory-u3-api',
    docs: '/api/v1 (arriving with the first milestone that needs it)',
  }));

  app.addHook('onClose', async () => {
    await connection.close();
  });

  return app;
}
