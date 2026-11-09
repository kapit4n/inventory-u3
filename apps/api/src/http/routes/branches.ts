/**
 * Branch master data.
 *
 * The request's organization comes from the session; a branch id from the URL is
 * always combined with that organization before a repository is called. Branches
 * are deactivated rather than deleted because later operational records keep a
 * reference to them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createBranch,
  DomainError,
  notFound,
  updateBranch,
  type BranchRepository,
  type Clock,
  type IdGenerator,
} from '@inventory-u3/domain';
import { asBranchId, type BranchId, type OrganizationId } from '@inventory-u3/types';
import {
  branchIdParamsSchema,
  createBranchSchema,
  updateBranchSchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface BranchDependencies {
  readonly branches: BranchRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerBranchRoutes(
  app: FastifyInstance,
  { branches, clock, ids }: BranchDependencies,
): Promise<void> {
  app.get(
    '/api/v1/branches',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        return { items: await branches.listByOrganization(organizationId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list branches');
      }
    },
  );

  app.post(
    '/api/v1/branches',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = createBranchSchema.safeParse(request.body);

      if (!parsed.success) {
        return validationProblem(reply, request, 'The branch could not be accepted', parsed.error);
      }

      try {
        const branch = createBranch(
          {
            id: asBranchId(ids.nextId()),
            organizationId,
            name: parsed.data.name,
            isActive: parsed.data.isActive,
          },
          clock.now(),
        );

        await assertNameAvailable(branches, organizationId, branch.name);
        const saved = await branches.create(branch);
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the branch');
      }
    },
  );

  app.put(
    '/api/v1/branches/:branchId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = branchIdParamsSchema.safeParse(request.params);
      const body = updateBranchSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The branch identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(reply, request, 'The branch could not be accepted', body.error);
      }

      try {
        const current = await branches.findById(organizationId, params.data.branchId as BranchId);
        if (!current) {
          throw notFound('Branch', params.data.branchId);
        }

        const next = updateBranch(current, body.data, clock.now());
        if (next.name !== current.name) {
          await assertNameAvailable(branches, organizationId, next.name, current.id);
        }

        const saved = await branches.update(next);
        if (!saved) {
          throw notFound('Branch', params.data.branchId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the branch');
      }
    },
  );
}

async function assertNameAvailable(
  branches: BranchRepository,
  organizationId: OrganizationId,
  name: string,
  currentBranchId?: BranchId,
): Promise<void> {
  const existing = await branches.findByName(organizationId, name);
  if (existing && existing.id !== currentBranchId) {
    throw new DomainError('DUPLICATED_RECORD', 'A branch with that name already exists', { name });
  }
}

function validationProblem(
  reply: FastifyReply,
  request: FastifyRequest,
  message: string,
  error: { issues: unknown },
): FastifyReply {
  return reply.status(422).send({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: { issues: error.issues },
      requestId: request.id,
    },
  });
}
