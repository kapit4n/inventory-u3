/**
 * Employee master data.
 *
 * The request's organization comes from the session; an employee id from the URL
 * and a branch id from the body are always combined with that organization before
 * a repository is called. Employees are deactivated rather than deleted because
 * later production records keep a reference to them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createEmployee,
  DomainError,
  notFound,
  updateEmployee,
  type BranchRepository,
  type Clock,
  type EmployeeRepository,
  type IdGenerator,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asEmployeeId,
  type BranchId,
  type EmployeeId,
  type OrganizationId,
} from '@inventory-u3/types';
import {
  createEmployeeSchema,
  employeeIdParamsSchema,
  updateEmployeeSchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface EmployeeDependencies {
  readonly employees: EmployeeRepository;
  readonly branches: BranchRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerEmployeeRoutes(
  app: FastifyInstance,
  { employees, branches, clock, ids }: EmployeeDependencies,
): Promise<void> {
  app.get(
    '/api/v1/employees',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        return { items: await employees.listByOrganization(organizationId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list employees');
      }
    },
  );

  app.post(
    '/api/v1/employees',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = createEmployeeSchema.safeParse(request.body);

      if (!parsed.success) {
        return validationProblem(
          reply,
          request,
          'The employee could not be accepted',
          parsed.error,
        );
      }

      try {
        const branchId = asBranchId(parsed.data.branchId);
        await assertBranchExists(branches, organizationId, branchId);

        const employee = createEmployee(
          {
            id: asEmployeeId(ids.nextId()),
            organizationId,
            branchId,
            fullName: parsed.data.fullName,
            isActive: parsed.data.isActive,
          },
          clock.now(),
        );

        const saved = await employees.create(employee);
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the employee');
      }
    },
  );

  app.put(
    '/api/v1/employees/:employeeId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = employeeIdParamsSchema.safeParse(request.params);
      const body = updateEmployeeSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The employee identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(reply, request, 'The employee could not be accepted', body.error);
      }

      try {
        const employeeId = params.data.employeeId as EmployeeId;
        const current = await employees.findById(organizationId, employeeId);
        if (!current) {
          throw notFound('Employee', employeeId);
        }

        const branchId = asBranchId(body.data.branchId);
        await assertBranchExists(branches, organizationId, branchId);

        const next = updateEmployee(current, { ...body.data, branchId }, clock.now());
        const saved = await employees.update(next);
        if (!saved) {
          throw notFound('Employee', employeeId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the employee');
      }
    },
  );
}

async function assertBranchExists(
  branches: BranchRepository,
  organizationId: OrganizationId,
  branchId: BranchId,
): Promise<void> {
  const branch = await branches.findById(organizationId, branchId);
  if (!branch) {
    throw new DomainError(
      'INVALID_INPUT',
      'The assigned branch does not exist in this organization',
      { branchId },
    );
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
