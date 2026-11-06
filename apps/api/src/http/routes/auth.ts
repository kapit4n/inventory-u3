/**
 * Authentication endpoints: log in, log out, and "who am I".
 *
 * The route is thin: it validates the body, calls the use case and shapes the
 * reply. The bearer token is returned in the response body, not a cookie.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { DomainError, login, logout, type AuthDependencies } from '@inventory-u3/domain';
import { loginSchema } from '@inventory-u3/validation';
import type { OrganizationId } from '@inventory-u3/types';

import type { LoginRateLimiter } from '../../infrastructure/security/login-rate-limiter.js';
import { sendProblem } from '../problem.js';

export interface AuthRoutesDependencies {
  readonly auth: AuthDependencies;
  /** The organization this process serves; login is scoped to it. */
  readonly organizationId: string;
  readonly loginRateLimiter: LoginRateLimiter;
}

function rateLimitKey(email: string, clientAddress: string): string {
  return `${email.trim().toLowerCase()}|${clientAddress}`;
}

function readBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (typeof header !== 'string') {
    return undefined;
  }
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  { auth, organizationId, loginRateLimiter }: AuthRoutesDependencies,
): Promise<void> {
  app.post('/api/v1/auth/login', { config: { public: true } }, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'The email or password is missing or malformed',
          details: { issues: parsed.error.issues },
          requestId: request.id,
        },
      });
    }

    const key = rateLimitKey(parsed.data.email, request.ip);
    const decision = loginRateLimiter.check(key);
    if (!decision.allowed) {
      request.log.warn(
        { requestId: request.id, clientAddress: request.ip },
        'Login refused by rate limiter',
      );
      reply.header('retry-after', String(decision.retryAfterSeconds));
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many sign-in attempts. Try again later.',
          requestId: request.id,
        },
      });
    }

    try {
      const result = await login(organizationId as OrganizationId, parsed.data, auth);
      loginRateLimiter.recordSuccess(key);
      return reply.status(200).send({
        token: result.token,
        expiresAt: result.expiresAt,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof DomainError && error.code === 'UNAUTHENTICATED') {
        loginRateLimiter.recordFailure(key);
      }
      return sendProblem(reply, request, error, 'Login failed');
    }
  });

  app.post('/api/v1/auth/logout', async (request, reply) => {
    const token = readBearerToken(request);
    try {
      if (token) {
        await logout(token, auth);
      }
      return reply.status(204).send();
    } catch (error) {
      return sendProblem(reply, request, error, 'Logout failed');
    }
  });

  app.get('/api/v1/auth/me', async (request, reply) => {
    const user = await auth.users.findById(
      request.organizationId as OrganizationId,
      request.principal.userId,
    );
    if (!user) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'The account no longer exists',
          requestId: request.id,
        },
      });
    }

    return { user, expiresAt: null };
  });
}
