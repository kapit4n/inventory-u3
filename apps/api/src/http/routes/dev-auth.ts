/**
 * Development-only doors: list the organization's users and start a session as
 * one of them without a password (ADR 0030).
 *
 * These routes are not registered in production.
 */

import type { FastifyInstance } from 'fastify';
import { startSessionForUser, type AuthDependencies } from '@inventory-u3/domain';
import { devLoginSchema } from '@inventory-u3/validation';
import type { OrganizationId, UserId } from '@inventory-u3/types';

import { sendProblem } from '../problem.js';

export interface DevAuthRoutesDependencies {
  readonly auth: AuthDependencies;
  /** The organization this process serves; the chooser lists only its users. */
  readonly organizationId: string;
}

export async function registerDevAuthRoutes(
  app: FastifyInstance,
  { auth, organizationId }: DevAuthRoutesDependencies,
): Promise<void> {
  app.get('/api/v1/auth/dev-users', { config: { public: true } }, async () => {
    const users = await auth.users.listByOrganization(organizationId as OrganizationId);
    return { items: users.filter((user) => user.isActive) };
  });

  app.post('/api/v1/auth/dev-login', { config: { public: true } }, async (request, reply) => {
    const parsed = devLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'A user id is required',
          details: { issues: parsed.error.issues },
          requestId: request.id,
        },
      });
    }

    try {
      const userId = parsed.data.userId as UserId;
      const result = await startSessionForUser(organizationId as OrganizationId, userId, auth);
      request.log.warn({ requestId: request.id, userId }, 'Development sign-in used');
      return reply.status(200).send({
        token: result.token,
        expiresAt: result.expiresAt,
        user: result.user,
      });
    } catch (error) {
      return sendProblem(reply, request, error, 'Development login failed');
    }
  });
}
