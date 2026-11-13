/**
 * Measurement-unit master data.
 *
 * Units are organization-wide and their code is unique within the organization.
 * The code is the stable short label used on operational records; the name is
 * the readable description. Units are deactivated rather than deleted because
 * products and later movements reference them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createMeasurementUnit,
  DomainError,
  notFound,
  updateMeasurementUnit,
  type Clock,
  type IdGenerator,
  type MeasurementUnitRepository,
} from '@inventory-u3/domain';
import {
  asMeasurementUnitId,
  type MeasurementUnitId,
  type OrganizationId,
} from '@inventory-u3/types';
import {
  createMeasurementUnitSchema,
  measurementUnitIdParamsSchema,
  updateMeasurementUnitSchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface MeasurementUnitDependencies {
  readonly measurementUnits: MeasurementUnitRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerMeasurementUnitRoutes(
  app: FastifyInstance,
  { measurementUnits, clock, ids }: MeasurementUnitDependencies,
): Promise<void> {
  app.get(
    '/api/v1/measurement-units',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        return { items: await measurementUnits.listByOrganization(organizationId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list measurement units');
      }
    },
  );

  app.post(
    '/api/v1/measurement-units',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = createMeasurementUnitSchema.safeParse(request.body);

      if (!parsed.success) {
        return validationProblem(
          reply,
          request,
          'The measurement unit could not be accepted',
          parsed.error,
        );
      }

      try {
        const measurementUnit = createMeasurementUnit(
          {
            id: asMeasurementUnitId(ids.nextId()),
            organizationId,
            code: parsed.data.code,
            name: parsed.data.name,
            isActive: parsed.data.isActive,
          },
          clock.now(),
        );

        await assertCodeAvailable(measurementUnits, organizationId, measurementUnit.code);
        const saved = await measurementUnits.create(measurementUnit);
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the measurement unit');
      }
    },
  );

  app.put(
    '/api/v1/measurement-units/:measurementUnitId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = measurementUnitIdParamsSchema.safeParse(request.params);
      const body = updateMeasurementUnitSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The measurement unit identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The measurement unit could not be accepted',
          body.error,
        );
      }

      try {
        const measurementUnitId = asMeasurementUnitId(params.data.measurementUnitId);
        const current = await measurementUnits.findById(organizationId, measurementUnitId);
        if (!current) {
          throw notFound('Measurement unit', measurementUnitId);
        }

        const next = updateMeasurementUnit(current, body.data, clock.now());
        if (next.code !== current.code) {
          await assertCodeAvailable(measurementUnits, organizationId, next.code, current.id);
        }

        const saved = await measurementUnits.update(next);
        if (!saved) {
          throw notFound('Measurement unit', measurementUnitId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the measurement unit');
      }
    },
  );
}

async function assertCodeAvailable(
  measurementUnits: MeasurementUnitRepository,
  organizationId: OrganizationId,
  code: string,
  currentMeasurementUnitId?: MeasurementUnitId,
): Promise<void> {
  const existing = await measurementUnits.findByCode(organizationId, code);
  if (existing && existing.id !== currentMeasurementUnitId) {
    throw new DomainError('DUPLICATED_RECORD', 'A measurement unit with that code already exists', {
      code,
    });
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
