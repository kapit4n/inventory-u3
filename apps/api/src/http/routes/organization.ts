/**
 * `GET /api/v1/organization` — the organization the app is looking at.
 *
 * The organization's own record is the source for its timezone and currency.
 */

import type { FastifyInstance } from 'fastify';

import { updateOrganizationSettings, type OrganizationRepository } from '@inventory-u3/domain';
import type { OrganizationId } from '@inventory-u3/types';
import { updateOrganizationSettingsSchema } from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface OrganizationDependencies {
  readonly organizations: OrganizationRepository;
}

export async function registerOrganizationRoutes(
  app: FastifyInstance,
  { organizations }: OrganizationDependencies,
): Promise<void> {
  app.get(
    '/api/v1/organization',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        const organization = await organizations.findById(organizationId);

        if (!organization) {
          request.log.error(
            { organizationId },
            'No organization row matches the organization this request is scoped to',
          );
          return sendProblem(
            reply,
            request,
            new Error(`No organization row for id ${organizationId}`),
            'Failed to read the organization',
          );
        }

        return organization;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read the organization');
      }
    },
  );

  app.put(
    '/api/v1/organization',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = updateOrganizationSettingsSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(422).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'The organization settings could not be accepted',
            details: { issues: parsed.error.issues },
            requestId: request.id,
          },
        });
      }

      try {
        const current = await organizations.findById(organizationId);
        if (!current) {
          return sendProblem(
            reply,
            request,
            new Error(`No organization row for id ${organizationId}`),
            'Failed to update the organization',
          );
        }

        const next = updateOrganizationSettings(current, parsed.data, new Date().toISOString());
        return await organizations.updateSettings(organizationId, next);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the organization');
      }
    },
  );
}
