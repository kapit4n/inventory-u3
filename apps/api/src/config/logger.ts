/**
 * Structured logging for the API.
 *
 * Rules that matter for this product:
 * - logs are JSON, so they can be shipped and searched;
 * - every line carries the request id, so a user-reported error is traceable;
 * - no personal content (names, emails, notes) is ever logged. Only ids,
 *   statuses and durations are.
 */

import type { FastifyBaseLogger, FastifyServerOptions } from 'fastify';
import type { ApiConfig } from './env.js';

export interface LoggerOptions {
  readonly level: string;
  readonly pretty: boolean;
}

export function loggerOptions(config: ApiConfig): FastifyServerOptions['logger'] {
  const base = {
    level: config.logLevel,
    base: {
      service: 'inventory-u3-api',
      environment: config.nodeEnv,
    },
    // Longest fields win; anything not listed below is still eligible for
    // redaction by the paths we do list.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'req.body',
        'res.body',
        'password',
        'passwordHash',
        'email',
      ],
      censor: '[redacted]',
    },
  };

  if (config.logPretty) {
    return {
      ...base,
      // pino-pretty is a devDependency: this branch is only reached when
      // NODE_ENV=development, and the transport is resolved lazily at runtime.
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss' },
      },
    } as FastifyServerOptions['logger'];
  }

  return base;
}

/** Application events are a finite set of names, never free text. */
export type ApplicationEvent =
  | 'organization.settings_changed'
  | 'auth.login_succeeded'
  | 'auth.login_failed'
  | 'auth.logged_out';

export interface ApplicationEventPayload {
  readonly event: ApplicationEvent;
  readonly organizationId: string;
  /** Ids only — never personal content. */
  readonly entityId: string;
  readonly [key: string]: unknown;
}

export function logApplicationEvent(
  logger: FastifyBaseLogger,
  payload: ApplicationEventPayload,
): void {
  logger.info(payload);
}
