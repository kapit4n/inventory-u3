import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodError } from 'zod';

import {
  notFound,
  type BranchRepository,
  type Clock,
  type DailyClosing,
  type DailyClosingRepository,
  type IdGenerator,
  type OrganizationRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import { asBranchId, asDailyClosingId, type OrganizationId } from '@inventory-u3/types';
import {
  createDailyClosingSchema,
  dailyClosingIdParamsSchema,
  dailyClosingListQuerySchema,
  reopenDailyClosingSchema,
} from '@inventory-u3/validation';

import { confirmDailyClosingUseCase } from '../../application/daily-closing/confirm-daily-closing.js';
import { createDailyClosingUseCase } from '../../application/daily-closing/create-daily-closing.js';
import { reopenDailyClosingUseCase } from '../../application/daily-closing/reopen-daily-closing.js';
import { reviewDailyClosingUseCase } from '../../application/daily-closing/review-daily-closing.js';
import { sendProblem } from '../problem.js';

export interface DailyClosingDependencies {
  readonly dailyClosings: DailyClosingRepository;
  readonly branches: BranchRepository;
  readonly organizations: OrganizationRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerDailyClosingRoutes(
  app: FastifyInstance,
  dependencies: DailyClosingDependencies,
): Promise<void> {
  const { dailyClosings, organizations, unitOfWork, clock, ids } = dependencies;

  app.get(
    '/api/v1/daily-closings',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const query = dailyClosingListQuerySchema.safeParse(request.query);
      if (!query.success) {
        return validationProblem(
          reply,
          request,
          'The daily closing filter is not valid',
          query.error,
        );
      }

      try {
        const closings = query.data.branchId
          ? await dailyClosings.listByBranch(organizationId, asBranchId(query.data.branchId))
          : await dailyClosings.listByOrganization(organizationId);
        const filtered =
          query.data.businessDate === undefined
            ? closings
            : closings.filter((closing) => closing.businessDate === query.data.businessDate);
        return { items: currentVersions(filtered) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list daily closings');
      }
    },
  );

  app.get(
    '/api/v1/daily-closings/:dailyClosingId',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = dailyClosingIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The daily closing identifier is not valid',
          params.error,
        );
      }

      try {
        const dailyClosingId = asDailyClosingId(params.data.dailyClosingId);
        const closing = await dailyClosings.findById(organizationId, dailyClosingId);
        if (!closing) {
          throw notFound('DailyClosing', dailyClosingId);
        }
        return closing;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read the daily closing');
      }
    },
  );

  app.post(
    '/api/v1/daily-closings',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = createDailyClosingSchema.safeParse(request.body);
      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The daily closing could not be accepted',
          body.error,
        );
      }

      try {
        const saved = await createDailyClosingUseCase(
          {
            organizationId,
            branchId: asBranchId(body.data.branchId),
            businessDate: body.data.businessDate,
            createdByUserId: request.principal.userId,
          },
          {
            branches: dependencies.branches,
            organizations,
            unitOfWork,
            clock,
            ids,
          },
        );
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the daily closing');
      }
    },
  );

  app.post(
    '/api/v1/daily-closings/:dailyClosingId/review',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = dailyClosingIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The daily closing identifier is not valid',
          params.error,
        );
      }

      try {
        return await reviewDailyClosingUseCase(
          {
            organizationId,
            dailyClosingId: asDailyClosingId(params.data.dailyClosingId),
            reviewedByUserId: request.principal.userId,
          },
          { unitOfWork, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to review the daily closing');
      }
    },
  );

  app.post(
    '/api/v1/daily-closings/:dailyClosingId/confirm',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = dailyClosingIdParamsSchema.safeParse(request.params);
      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The daily closing identifier is not valid',
          params.error,
        );
      }

      try {
        return await confirmDailyClosingUseCase(
          {
            organizationId,
            dailyClosingId: asDailyClosingId(params.data.dailyClosingId),
            confirmedByUserId: request.principal.userId,
          },
          { unitOfWork, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to confirm the daily closing');
      }
    },
  );

  app.post(
    '/api/v1/daily-closings/:dailyClosingId/reopen',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = dailyClosingIdParamsSchema.safeParse(request.params);
      const body = reopenDailyClosingSchema.safeParse(request.body);
      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The daily closing identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(reply, request, 'The reopen reason is not valid', body.error);
      }

      try {
        return await reopenDailyClosingUseCase(
          {
            organizationId,
            dailyClosingId: asDailyClosingId(params.data.dailyClosingId),
            reopenedByUserId: request.principal.userId,
            reason: body.data.reason,
          },
          { organizations, unitOfWork, clock, ids },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to reopen the daily closing');
      }
    },
  );
}

function currentVersions(closings: readonly DailyClosing[]): readonly DailyClosing[] {
  const current = new Map<string, DailyClosing>();
  for (const closing of closings) {
    const key = `${closing.branchId}:${closing.businessDate}`;
    const existing = current.get(key);
    if (!existing || closing.version > existing.version) {
      current.set(key, closing);
    }
  }
  return [...current.values()].sort(
    (left, right) =>
      right.businessDate.localeCompare(left.businessDate) ||
      left.branchId.localeCompare(right.branchId),
  );
}

function validationProblem(
  reply: FastifyReply,
  request: FastifyRequest,
  message: string,
  error: ZodError,
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
