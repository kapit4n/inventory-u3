/**
 * Authentication for the request lifecycle.
 *
 * Reads the bearer token, turns it into a `Principal` through
 * `resolvePrincipal`, and puts the resolved organization and principal on the
 * request. Every route is authenticated by default; public routes declare it.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type {
  AuthDependencies,
  OrganizationPermission,
  OrganizationRole,
  Principal,
} from '@inventory-u3/domain';
import { DomainError, hasPermission, resolvePrincipal } from '@inventory-u3/domain';
import type { OrganizationId } from '@inventory-u3/types';

import type { ApiConfig } from '../../config/env.js';
import { sendProblem } from '../problem.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** The organization this request may read and write. */
    organizationId: string;
    /** The authenticated caller. Present on every authenticated route. */
    principal: Principal;
  }

  interface FastifyContextConfig {
    /** `true` on routes reachable without a session. Nothing else is public. */
    public?: boolean;
    /** Permission(s) the caller's role must carry to reach this route. */
    permission?: OrganizationPermission | readonly OrganizationPermission[];
  }
}

export interface AuthPluginOptions {
  readonly config: ApiConfig;
  readonly auth: AuthDependencies;
}

function readBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (typeof header !== 'string') {
    return undefined;
  }

  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }
  return token;
}

export async function registerAuth(
  app: FastifyInstance,
  options: AuthPluginOptions,
): Promise<void> {
  app.decorateRequest('organizationId', '');
  app.decorateRequest('principal', null as unknown as Principal);

  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.url === undefined) {
      return;
    }

    if (request.routeOptions.config.public === true) {
      return;
    }

    const token = readBearerToken(request);
    if (!token) {
      reply.header('www-authenticate', 'Bearer');
      return sendProblem(
        reply,
        request,
        new DomainError('UNAUTHENTICATED', 'Authentication is required'),
        'Missing bearer token',
      );
    }

    try {
      const principal = await resolvePrincipal(
        options.config.organizationId as OrganizationId,
        token,
        options.auth,
      );
      request.principal = principal;
      request.organizationId = principal.organizationId;
    } catch (error) {
      reply.header('www-authenticate', 'Bearer');
      return sendProblem(reply, request, error, 'Resolving the session failed');
    }

    const required = request.routeOptions.config.permission;
    if (required !== undefined) {
      assertPermission(request.principal, ...(Array.isArray(required) ? required : [required]));
    }
  });
}

/**
 * Refuse the request unless the caller's role carries every named permission.
 */
export function assertPermission(
  principal: Principal,
  ...permissions: OrganizationPermission[]
): void {
  const missing = permissions.filter((permission) => !hasPermission(principal.role, permission));
  if (missing.length > 0) {
    throw new DomainError('FORBIDDEN', 'The role may not perform this action', {
      role: principal.role satisfies OrganizationRole,
      required: permissions,
      missing,
    });
  }
}
