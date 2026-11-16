import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createProductionBatch,
  DomainError,
  notFound,
  type BranchRepository,
  type Clock,
  type EmployeeRepository,
  type IdGenerator,
  type MeasurementUnitRepository,
  type ProductPresentationRepository,
  type ProductRepository,
  type ProductionBatchRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asEmployeeId,
  asProductId,
  asProductPresentationId,
  asProductionBatchId,
  asProductionInputId,
  asProductionOutputId,
  asProductionWasteId,
  type OrganizationId,
} from '@inventory-u3/types';
import {
  correctProductionBatchSchema,
  createProductionBatchSchema,
  productionBatchIdParamsSchema,
  productionBatchListQuerySchema,
} from '@inventory-u3/validation';

import { confirmProductionBatchUseCase } from '../../application/production/confirm-production-batch.js';
import { correctProductionBatchUseCase } from '../../application/production/correct-production-batch.js';
import { sendProblem } from '../problem.js';

export interface ProductionDependencies {
  readonly productionBatches: ProductionBatchRepository;
  readonly branches: BranchRepository;
  readonly employees: EmployeeRepository;
  readonly products: ProductRepository;
  readonly productPresentations: ProductPresentationRepository;
  readonly measurementUnits: MeasurementUnitRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerProductionRoutes(
  app: FastifyInstance,
  dependencies: ProductionDependencies,
): Promise<void> {
  const {
    productionBatches,
    branches,
    employees,
    products,
    productPresentations,
    measurementUnits,
    unitOfWork,
    clock,
    ids,
  } = dependencies;

  app.get(
    '/api/v1/production',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const query = productionBatchListQuerySchema.safeParse(request.query);

      if (!query.success) {
        return validationProblem(
          reply,
          request,
          'The production batch filter is not valid',
          query.error,
        );
      }

      try {
        return {
          items: query.data.branchId
            ? await productionBatches.listByBranch(organizationId, asBranchId(query.data.branchId))
            : await productionBatches.listByOrganization(organizationId),
        };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list production batches');
      }
    },
  );

  app.get(
    '/api/v1/production/:batchId',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productionBatchIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The production batch identifier is not valid',
          params.error,
        );
      }

      try {
        const productionBatchId = asProductionBatchId(params.data.batchId);
        const batch = await productionBatches.findById(organizationId, productionBatchId);
        if (!batch) {
          throw notFound('ProductionBatch', productionBatchId);
        }
        return batch;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read the production batch');
      }
    },
  );

  app.post(
    '/api/v1/production',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = createProductionBatchSchema.safeParse(request.body);

      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The production batch could not be accepted',
          body.error,
        );
      }

      try {
        const branchId = asBranchId(body.data.branchId);
        const branch = await branches.findById(organizationId, branchId);
        if (!branch) {
          throw notFound('Branch', branchId);
        }
        if (!branch.isActive) {
          throw new DomainError(
            'INVALID_INPUT',
            'Production must be registered in an active branch',
            {
              branchId,
            },
          );
        }

        const preparedByEmployeeId = asEmployeeId(body.data.preparedByEmployeeId);
        const employee = await employees.findById(organizationId, preparedByEmployeeId);
        if (!employee) {
          throw notFound('Employee', preparedByEmployeeId);
        }
        if (!employee.isActive || employee.branchId !== branchId) {
          throw new DomainError(
            'INVALID_INPUT',
            'The preparer must be an active employee of the production branch',
            { employeeId: employee.id, branchId },
          );
        }

        const inputs = [];
        for (const line of body.data.inputs) {
          const productId = asProductId(line.productId);
          const product = await products.findById(organizationId, productId);
          if (!product) {
            throw notFound('Product', productId);
          }
          if (!product.isActive || product.kind !== 'RAW') {
            throw new DomainError(
              'INVALID_INPUT',
              'A production input must be an active raw product',
              { productId },
            );
          }

          inputs.push({
            id: asProductionInputId(ids.nextId()),
            productId,
            unitId: product.inventoryUnitId,
            quantityMilli: line.quantityMilli,
          });
        }

        const outputs = [];
        for (const line of body.data.outputs) {
          const productId = asProductId(line.productId);
          const product = await products.findById(organizationId, productId);
          if (!product) {
            throw notFound('Product', productId);
          }
          if (!product.isActive || product.kind !== 'PROCESSED') {
            throw new DomainError(
              'INVALID_INPUT',
              'A production output must be an active processed product',
              { productId },
            );
          }

          const inventoryUnit = await measurementUnits.findById(
            organizationId,
            product.inventoryUnitId,
          );
          if (!inventoryUnit || inventoryUnit.code !== 'kg') {
            throw new DomainError(
              'INVALID_INPUT',
              'Production output weight requires the product inventory unit to be kilograms',
              { productId, unitId: product.inventoryUnitId },
            );
          }

          const presentationId = asProductPresentationId(line.presentationId);
          const presentation = await productPresentations.findById(organizationId, presentationId);
          if (!presentation) {
            throw notFound('ProductPresentation', presentationId);
          }
          if (!presentation.isActive || presentation.productId !== productId) {
            throw new DomainError(
              'INVALID_INPUT',
              'The production output presentation must be active and belong to the product',
              { productId, presentationId },
            );
          }

          outputs.push({
            id: asProductionOutputId(ids.nextId()),
            productId,
            presentationId,
            trayCount: line.trayCount,
            averageWeightPerTrayGrams: presentation.averageWeightGrams,
            ...(line.measuredWeightGrams === undefined
              ? {}
              : { measuredWeightGrams: line.measuredWeightGrams }),
          });
        }

        const waste = [];
        for (const line of body.data.waste) {
          const productId = asProductId(line.productId);
          const product = await products.findById(organizationId, productId);
          if (!product) {
            throw notFound('Product', productId);
          }
          if (!product.isActive) {
            throw new DomainError(
              'INVALID_INPUT',
              'Production waste must reference an active product',
              {
                productId,
              },
            );
          }

          waste.push({
            id: asProductionWasteId(ids.nextId()),
            productId,
            quantityMilli: line.quantityMilli,
            reason: line.reason,
            ...(line.note === undefined ? {} : { note: line.note }),
          });
        }

        const batch = createProductionBatch(
          {
            id: asProductionBatchId(ids.nextId()),
            organizationId,
            branchId,
            businessDate: body.data.businessDate,
            preparedByEmployeeId,
            registeredByUserId: request.principal.userId,
            note: body.data.note,
            inputs,
            outputs,
            waste,
          },
          clock.now(),
        );

        const saved = await unitOfWork.transaction((repositories) =>
          repositories.productionBatches.create(batch),
        );
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the production batch');
      }
    },
  );

  app.post(
    '/api/v1/production/:batchId/confirm',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productionBatchIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The production batch identifier is not valid',
          params.error,
        );
      }

      try {
        return await confirmProductionBatchUseCase(
          {
            organizationId,
            productionBatchId: asProductionBatchId(params.data.batchId),
            confirmedByUserId: request.principal.userId,
          },
          { unitOfWork, ids, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to confirm the production batch');
      }
    },
  );

  app.post(
    '/api/v1/production/:batchId/correct',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productionBatchIdParamsSchema.safeParse(request.params);
      const body = correctProductionBatchSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The production batch identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The correction could not be accepted',
          body.error,
        );
      }

      try {
        return await correctProductionBatchUseCase(
          {
            organizationId,
            productionBatchId: asProductionBatchId(params.data.batchId),
            correctedByUserId: request.principal.userId,
            reason: body.data.reason,
          },
          { unitOfWork, ids, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to correct the production batch');
      }
    },
  );

  app.delete(
    '/api/v1/production/:batchId',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productionBatchIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The production batch identifier is not valid',
          params.error,
        );
      }

      try {
        const productionBatchId = asProductionBatchId(params.data.batchId);
        const batch = await productionBatches.findById(organizationId, productionBatchId);
        if (!batch) {
          throw notFound('ProductionBatch', productionBatchId);
        }
        if (batch.status !== 'DRAFT') {
          throw new DomainError('INVALID_STATE', 'Only a draft production batch can be discarded', {
            status: batch.status,
          });
        }

        const deleted = await productionBatches.deleteDraft(organizationId, productionBatchId);
        if (!deleted) {
          throw new DomainError('INVALID_STATE', 'The production batch is no longer a draft');
        }

        return reply.status(204).send();
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to discard the production batch');
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
