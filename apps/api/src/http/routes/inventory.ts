import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  notFound,
  type BranchRepository,
  type Clock,
  type IdGenerator,
  type StockMovementRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import { asBranchId, asProductId, type OrganizationId } from '@inventory-u3/types';
import {
  inventoryWasteBodySchema,
  stockAdjustmentBodySchema,
  stockBalanceQuerySchema,
  stockMovementQuerySchema,
  stockProductParamsSchema,
  stockReconciliationBodySchema,
} from '@inventory-u3/validation';

import { adjustStockUseCase } from '../../application/inventory/adjust-stock.js';
import { reconcileStockUseCase } from '../../application/inventory/reconcile-stock.js';
import { recordInventoryWasteUseCase } from '../../application/inventory/record-inventory-waste.js';
import { sendProblem } from '../problem.js';

export interface InventoryDependencies {
  readonly stockMovements: StockMovementRepository;
  readonly branches: BranchRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerInventoryRoutes(
  app: FastifyInstance,
  dependencies: InventoryDependencies,
): Promise<void> {
  const { stockMovements, branches, unitOfWork, clock, ids } = dependencies;

  app.get(
    '/api/v1/inventory',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const query = stockBalanceQuerySchema.safeParse(request.query);

      if (!query.success) {
        return validationProblem(reply, request, 'The branch filter is not valid', query.error);
      }

      try {
        const branchId = asBranchId(query.data.branchId);
        const branch = await branches.findById(organizationId, branchId);
        if (!branch) {
          throw notFound('Branch', branchId);
        }

        return { items: await stockMovements.listBalancesByBranch(organizationId, branchId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list branch stock');
      }
    },
  );

  app.get(
    '/api/v1/inventory/:productId/movements',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = stockProductParamsSchema.safeParse(request.params);
      const query = stockMovementQuerySchema.safeParse(request.query);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The product identifier is not valid',
          params.error,
        );
      }
      if (!query.success) {
        return validationProblem(reply, request, 'The branch filter is not valid', query.error);
      }

      try {
        const branchId = asBranchId(query.data.branchId);
        const branch = await branches.findById(organizationId, branchId);
        if (!branch) {
          throw notFound('Branch', branchId);
        }

        return {
          items: await stockMovements.listByBranchAndProduct(
            organizationId,
            branchId,
            asProductId(params.data.productId),
          ),
        };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read stock movements');
      }
    },
  );

  app.post(
    '/api/v1/inventory/adjustments',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = stockAdjustmentBodySchema.safeParse(request.body);

      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The adjustment could not be accepted',
          body.error,
        );
      }

      try {
        const adjustment = await adjustStockUseCase(
          {
            organizationId,
            branchId: asBranchId(body.data.branchId),
            productId: asProductId(body.data.productId),
            quantityDeltaMilli: body.data.quantityDeltaMilli,
            reason: body.data.reason,
            note: body.data.note,
            recordedByUserId: request.principal.userId,
          },
          { unitOfWork, ids, clock },
        );
        return reply.status(201).send(adjustment);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to record the stock adjustment');
      }
    },
  );

  app.post(
    '/api/v1/inventory/waste',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = inventoryWasteBodySchema.safeParse(request.body);

      if (!body.success) {
        return validationProblem(reply, request, 'The waste could not be accepted', body.error);
      }

      try {
        const waste = await recordInventoryWasteUseCase(
          {
            organizationId,
            branchId: asBranchId(body.data.branchId),
            productId: asProductId(body.data.productId),
            quantityMilli: body.data.quantityMilli,
            reason: body.data.reason,
            note: body.data.note,
            recordedByUserId: request.principal.userId,
          },
          { unitOfWork, ids, clock },
        );
        return reply.status(201).send(waste);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to record inventory waste');
      }
    },
  );

  app.post(
    '/api/v1/inventory/reconciliations',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = stockReconciliationBodySchema.safeParse(request.body);

      if (!body.success) {
        return validationProblem(reply, request, 'The count could not be accepted', body.error);
      }

      try {
        const adjustment = await reconcileStockUseCase(
          {
            organizationId,
            branchId: asBranchId(body.data.branchId),
            productId: asProductId(body.data.productId),
            countedQuantityMilli: body.data.countedQuantityMilli,
            reason: body.data.reason,
            note: body.data.note,
            recordedByUserId: request.principal.userId,
          },
          { unitOfWork, ids, clock },
        );
        return reply.status(201).send(adjustment);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to reconcile branch stock');
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
