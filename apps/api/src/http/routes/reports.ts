import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ZodError } from 'zod';

import type { OrganizationRepository, ReportRepository } from '@inventory-u3/domain';
import { asBranchId, type OrganizationId } from '@inventory-u3/types';
import { reportQuerySchema } from '@inventory-u3/validation';

import { buildDashboardReport } from '../../application/report/dashboard-report.js';
import { sendProblem } from '../problem.js';

export interface ReportDependencies {
  readonly reports: ReportRepository;
  readonly organizations: OrganizationRepository;
}

export async function registerReportRoutes(
  app: FastifyInstance,
  { reports, organizations }: ReportDependencies,
): Promise<void> {
  app.get(
    '/api/v1/reports/summary',
    { config: { permission: 'reports:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const query = reportQuerySchema.safeParse(request.query);
      if (!query.success) {
        return validationProblem(reply, request, 'The report range is not valid', query.error);
      }

      try {
        return await buildDashboardReport(
          {
            organizationId,
            from: query.data.from,
            to: query.data.to,
            granularity: query.data.granularity,
            ...(query.data.branchId === undefined
              ? {}
              : { branchId: asBranchId(query.data.branchId) }),
          },
          { reports, organizations },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to build the report');
      }
    },
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
