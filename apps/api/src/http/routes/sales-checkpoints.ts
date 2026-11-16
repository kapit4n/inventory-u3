import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createSalesCheckpoint,
  DomainError,
  notFound,
  type BranchRepository,
  type Clock,
  type IdGenerator,
  type MeasurementUnitRepository,
  type NewSalesCheckpointItem,
  type ProductPresentationRepository,
  type ProductPriceHistory,
  type ProductPriceHistoryRepository,
  type ProductRepository,
  type SalesCheckpointRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asProductId,
  asProductPresentationId,
  asSalesCheckpointId,
  asSalesCheckpointItemId,
  type IsoDate,
  type OrganizationId,
  type ProductId,
} from '@inventory-u3/types';
import {
  correctSalesCheckpointSchema,
  createSalesCheckpointSchema,
  salesCheckpointIdParamsSchema,
  salesCheckpointListQuerySchema,
} from '@inventory-u3/validation';

import { confirmSalesCheckpointUseCase } from '../../application/sales-checkpoint/confirm-sales-checkpoint.js';
import { correctSalesCheckpointUseCase } from '../../application/sales-checkpoint/correct-sales-checkpoint.js';
import { sendProblem } from '../problem.js';

export interface SalesCheckpointDependencies {
  readonly salesCheckpoints: SalesCheckpointRepository;
  readonly branches: BranchRepository;
  readonly products: ProductRepository;
  readonly productPresentations: ProductPresentationRepository;
  readonly productPriceHistory: ProductPriceHistoryRepository;
  readonly measurementUnits: MeasurementUnitRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerSalesCheckpointRoutes(
  app: FastifyInstance,
  dependencies: SalesCheckpointDependencies,
): Promise<void> {
  const {
    salesCheckpoints,
    branches,
    products,
    productPresentations,
    productPriceHistory,
    measurementUnits,
    unitOfWork,
    clock,
    ids,
  } = dependencies;

  app.get(
    '/api/v1/sales-checkpoints',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const query = salesCheckpointListQuerySchema.safeParse(request.query);

      if (!query.success) {
        return validationProblem(
          reply,
          request,
          'The sales checkpoint filter is not valid',
          query.error,
        );
      }

      try {
        return {
          items: query.data.branchId
            ? await salesCheckpoints.listByBranch(organizationId, asBranchId(query.data.branchId))
            : await salesCheckpoints.listByOrganization(organizationId),
        };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list sales checkpoints');
      }
    },
  );

  app.get(
    '/api/v1/sales-checkpoints/:checkpointId',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = salesCheckpointIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The sales checkpoint identifier is not valid',
          params.error,
        );
      }

      try {
        const salesCheckpointId = asSalesCheckpointId(params.data.checkpointId);
        const checkpoint = await salesCheckpoints.findById(organizationId, salesCheckpointId);
        if (!checkpoint) {
          throw notFound('SalesCheckpoint', salesCheckpointId);
        }
        return checkpoint;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read the sales checkpoint');
      }
    },
  );

  app.post(
    '/api/v1/sales-checkpoints',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = createSalesCheckpointSchema.safeParse(request.body);

      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The sales checkpoint could not be accepted',
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
          throw new DomainError('INVALID_INPUT', 'Sales must be registered in an active branch', {
            branchId,
          });
        }

        const existing = await salesCheckpoints.findByPeriod(
          organizationId,
          branchId,
          body.data.businessDate,
          body.data.period,
        );
        if (existing) {
          throw new DomainError(
            'DUPLICATED_RECORD',
            'A sales checkpoint already exists for this branch, date and period',
            { salesCheckpointId: existing.id },
          );
        }

        const items: NewSalesCheckpointItem[] = [];
        for (const line of body.data.items) {
          const productId = asProductId(line.productId);
          const product = await products.findById(organizationId, productId);
          if (!product) {
            throw notFound('Product', productId);
          }
          if (!product.isActive) {
            throw new DomainError(
              'INVALID_INPUT',
              'A sales line must reference an active product',
              {
                productId,
              },
            );
          }

          const price = await effectiveSellingPrice(
            productPriceHistory,
            organizationId,
            productId,
            body.data.businessDate,
          );

          if (product.kind === 'RAW') {
            if (product.salesUnitId !== product.inventoryUnitId) {
              throw new DomainError(
                'INVALID_INPUT',
                'A raw sales product must use the same sales and inventory unit',
                { productId },
              );
            }
            if (line.quantityMilli === undefined) {
              throw new DomainError('INVALID_INPUT', 'A raw sales line requires a quantity', {
                productId,
              });
            }
            if (line.presentationId !== undefined || line.trayCount !== undefined) {
              throw new DomainError('INVALID_INPUT', 'A raw sales line must not use tray fields', {
                productId,
              });
            }
            if (price.priceBasis !== 'PER_SALES_UNIT') {
              throw new DomainError(
                'INVALID_INPUT',
                'A raw sales line requires a per-unit selling price',
                { productId },
              );
            }

            items.push({
              id: asSalesCheckpointItemId(ids.nextId()),
              productId,
              productKind: 'RAW',
              unitId: product.inventoryUnitId,
              quantityMilli: line.quantityMilli,
              sellingPriceAmountMinor: price.amountMinor,
              sellingPriceBasis: price.priceBasis,
              sellingPriceCurrency: price.currency,
            });
            continue;
          }

          if (line.presentationId === undefined || line.trayCount === undefined) {
            throw new DomainError(
              'INVALID_INPUT',
              'A processed sales line requires a presentation and tray count',
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
              'Processed sales weight requires the product inventory unit to be kilograms',
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
              'The sales presentation must be active and belong to the product',
              { productId, presentationId },
            );
          }
          if (price.priceBasis !== 'PER_KILOGRAM') {
            throw new DomainError(
              'INVALID_INPUT',
              'A processed sales line requires a per-kilogram selling price',
              { productId },
            );
          }

          items.push({
            id: asSalesCheckpointItemId(ids.nextId()),
            productId,
            productKind: 'PROCESSED',
            unitId: product.inventoryUnitId,
            presentationId,
            trayCount: line.trayCount,
            averageWeightPerTrayGrams: presentation.averageWeightGrams,
            ...(line.measuredWeightGrams === undefined
              ? {}
              : { measuredWeightGrams: line.measuredWeightGrams }),
            sellingPriceAmountMinor: price.amountMinor,
            sellingPriceBasis: price.priceBasis,
            sellingPriceCurrency: price.currency,
          });
        }

        const checkpoint = createSalesCheckpoint(
          {
            id: asSalesCheckpointId(ids.nextId()),
            organizationId,
            branchId,
            businessDate: body.data.businessDate,
            period: body.data.period,
            registeredByUserId: request.principal.userId,
            note: body.data.note,
            items,
          },
          clock.now(),
        );

        const saved = await unitOfWork.transaction((repositories) =>
          repositories.salesCheckpoints.create(checkpoint),
        );
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the sales checkpoint');
      }
    },
  );

  app.post(
    '/api/v1/sales-checkpoints/:checkpointId/confirm',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = salesCheckpointIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The sales checkpoint identifier is not valid',
          params.error,
        );
      }

      try {
        return await confirmSalesCheckpointUseCase(
          {
            organizationId,
            salesCheckpointId: asSalesCheckpointId(params.data.checkpointId),
            confirmedByUserId: request.principal.userId,
          },
          { unitOfWork, ids, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to confirm the sales checkpoint');
      }
    },
  );

  app.post(
    '/api/v1/sales-checkpoints/:checkpointId/correct',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = salesCheckpointIdParamsSchema.safeParse(request.params);
      const body = correctSalesCheckpointSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The sales checkpoint identifier is not valid',
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
        return await correctSalesCheckpointUseCase(
          {
            organizationId,
            salesCheckpointId: asSalesCheckpointId(params.data.checkpointId),
            correctedByUserId: request.principal.userId,
            reason: body.data.reason,
          },
          { unitOfWork, ids, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to correct the sales checkpoint');
      }
    },
  );

  app.delete(
    '/api/v1/sales-checkpoints/:checkpointId',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = salesCheckpointIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The sales checkpoint identifier is not valid',
          params.error,
        );
      }

      try {
        const salesCheckpointId = asSalesCheckpointId(params.data.checkpointId);
        const checkpoint = await salesCheckpoints.findById(organizationId, salesCheckpointId);
        if (!checkpoint) {
          throw notFound('SalesCheckpoint', salesCheckpointId);
        }
        if (checkpoint.status !== 'DRAFT') {
          throw new DomainError('INVALID_STATE', 'Only a draft sales checkpoint can be discarded', {
            status: checkpoint.status,
          });
        }

        const deleted = await salesCheckpoints.deleteDraft(organizationId, salesCheckpointId);
        if (!deleted) {
          throw new DomainError('INVALID_STATE', 'The sales checkpoint is no longer a draft');
        }

        return reply.status(204).send();
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to discard the sales checkpoint');
      }
    },
  );
}

async function effectiveSellingPrice(
  productPriceHistory: ProductPriceHistoryRepository,
  organizationId: OrganizationId,
  productId: ProductId,
  businessDate: IsoDate,
): Promise<ProductPriceHistory> {
  const history = await productPriceHistory.listByProduct(organizationId, productId);
  const price = history.find((row) => row.effectiveFrom <= businessDate);

  if (!price) {
    throw new DomainError(
      'INVALID_INPUT',
      'The product has no selling price effective on the business date',
      { productId, businessDate },
    );
  }

  return price;
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
