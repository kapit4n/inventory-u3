/**
 * Supplier master data.
 *
 * The organization comes from the session. Suppliers are organization-wide
 * because the same provider can deliver to several branches; a later purchase
 * carries the branch. Suppliers are deactivated rather than deleted because later
 * purchases keep a reference to them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createSupplier,
  notFound,
  updateSupplier,
  type Clock,
  type IdGenerator,
  type SupplierRepository,
} from '@inventory-u3/domain';
import { asSupplierId, type OrganizationId, type SupplierId } from '@inventory-u3/types';
import {
  createSupplierSchema,
  supplierIdParamsSchema,
  updateSupplierSchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface SupplierDependencies {
  readonly suppliers: SupplierRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerSupplierRoutes(
  app: FastifyInstance,
  { suppliers, clock, ids }: SupplierDependencies,
): Promise<void> {
  app.get(
    '/api/v1/suppliers',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        return { items: await suppliers.listByOrganization(organizationId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list suppliers');
      }
    },
  );

  app.post(
    '/api/v1/suppliers',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = createSupplierSchema.safeParse(request.body);

      if (!parsed.success) {
        return validationProblem(
          reply,
          request,
          'The supplier could not be accepted',
          parsed.error,
        );
      }

      try {
        const supplier = createSupplier(
          {
            id: asSupplierId(ids.nextId()),
            organizationId,
            name: parsed.data.name,
            isActive: parsed.data.isActive,
          },
          clock.now(),
        );

        const saved = await suppliers.create(supplier);
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the supplier');
      }
    },
  );

  app.put(
    '/api/v1/suppliers/:supplierId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = supplierIdParamsSchema.safeParse(request.params);
      const body = updateSupplierSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The supplier identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(reply, request, 'The supplier could not be accepted', body.error);
      }

      try {
        const supplierId = params.data.supplierId as SupplierId;
        const current = await suppliers.findById(organizationId, supplierId);
        if (!current) {
          throw notFound('Supplier', supplierId);
        }

        const next = updateSupplier(current, body.data, clock.now());
        const saved = await suppliers.update(next);
        if (!saved) {
          throw notFound('Supplier', supplierId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the supplier');
      }
    },
  );
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
