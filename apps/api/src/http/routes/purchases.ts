import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  cancelPurchase,
  createPurchase,
  DomainError,
  notFound,
  type BranchRepository,
  type Clock,
  type IdGenerator,
  type OrganizationRepository,
  type ProductRepository,
  type PurchaseCorrectionRepository,
  type PurchaseRepository,
  type SupplierRepository,
  type UnitOfWork,
} from '@inventory-u3/domain';
import {
  asBranchId,
  asMeasurementUnitId,
  asProductId,
  asPurchaseId,
  asPurchaseItemId,
  asSupplierId,
  type OrganizationId,
} from '@inventory-u3/types';
import {
  correctPurchaseSchema,
  createPurchaseSchema,
  purchaseIdParamsSchema,
  purchaseListQuerySchema,
} from '@inventory-u3/validation';

import { correctPurchaseUseCase } from '../../application/purchase/correct-purchase.js';
import { receivePurchaseUseCase } from '../../application/purchase/receive-purchase.js';
import { sendProblem } from '../problem.js';

export interface PurchaseDependencies {
  readonly purchases: PurchaseRepository;
  readonly purchaseCorrections: PurchaseCorrectionRepository;
  readonly branches: BranchRepository;
  readonly suppliers: SupplierRepository;
  readonly products: ProductRepository;
  readonly organizations: OrganizationRepository;
  readonly unitOfWork: UnitOfWork;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerPurchaseRoutes(
  app: FastifyInstance,
  dependencies: PurchaseDependencies,
): Promise<void> {
  const {
    purchases,
    purchaseCorrections,
    branches,
    suppliers,
    products,
    organizations,
    unitOfWork,
    clock,
    ids,
  } = dependencies;

  app.get(
    '/api/v1/purchases',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const query = purchaseListQuerySchema.safeParse(request.query);

      if (!query.success) {
        return validationProblem(reply, request, 'The purchase filter is not valid', query.error);
      }

      try {
        return {
          items: query.data.branchId
            ? await purchases.listByBranch(organizationId, asBranchId(query.data.branchId))
            : await purchases.listByOrganization(organizationId),
        };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list purchases');
      }
    },
  );

  app.get(
    '/api/v1/purchases/:purchaseId',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = purchaseIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The purchase identifier is not valid',
          params.error,
        );
      }

      try {
        const purchaseId = asPurchaseId(params.data.purchaseId);
        const purchase = await purchases.findById(organizationId, purchaseId);
        if (!purchase) {
          throw notFound('Purchase', purchaseId);
        }
        return purchase;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read the purchase');
      }
    },
  );

  app.post(
    '/api/v1/purchases',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const body = createPurchaseSchema.safeParse(request.body);

      if (!body.success) {
        return validationProblem(reply, request, 'The purchase could not be accepted', body.error);
      }

      try {
        const branchId = asBranchId(body.data.branchId);
        const supplierId = asSupplierId(body.data.supplierId);

        const branch = await branches.findById(organizationId, branchId);
        if (!branch) {
          throw notFound('Branch', branchId);
        }

        const supplier = await suppliers.findById(organizationId, supplierId);
        if (!supplier) {
          throw notFound('Supplier', supplierId);
        }

        const organization = await organizations.findById(organizationId);
        if (!organization) {
          throw notFound('Organization', organizationId);
        }

        const items = [];
        for (const item of body.data.items) {
          const productId = asProductId(item.productId);
          const product = await products.findById(organizationId, productId);
          if (!product) {
            throw notFound('Product', productId);
          }
          if (product.inventoryUnitId !== item.unitId) {
            throw new DomainError(
              'INVALID_INPUT',
              'Purchase line unit must match the product inventory unit until unit conversion is supported',
              { productId, unitId: item.unitId },
            );
          }

          items.push({
            id: asPurchaseItemId(ids.nextId()),
            productId,
            unitId: asMeasurementUnitId(item.unitId),
            quantityMilli: item.quantityMilli,
            unitPriceMinor: item.unitPriceMinor,
          });
        }

        const purchase = createPurchase(
          {
            id: asPurchaseId(ids.nextId()),
            organizationId,
            branchId,
            supplierId,
            deliveryDate: body.data.deliveryDate,
            currency: organization.currency,
            note: body.data.note,
            createdByUserId: request.principal.userId,
            items,
          },
          clock.now(),
        );

        const saved = await unitOfWork.transaction((repositories) =>
          repositories.purchases.create(purchase),
        );
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the purchase');
      }
    },
  );

  app.post(
    '/api/v1/purchases/:purchaseId/receive',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = purchaseIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The purchase identifier is not valid',
          params.error,
        );
      }

      try {
        return await receivePurchaseUseCase(
          {
            organizationId,
            purchaseId: asPurchaseId(params.data.purchaseId),
            receivedByUserId: request.principal.userId,
          },
          { unitOfWork, ids, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to receive the purchase');
      }
    },
  );

  app.get(
    '/api/v1/purchases/:purchaseId/correction',
    { config: { permission: 'inventory:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = purchaseIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The purchase identifier is not valid',
          params.error,
        );
      }

      try {
        const purchaseId = asPurchaseId(params.data.purchaseId);
        const correction = await purchaseCorrections.findByPurchaseId(organizationId, purchaseId);
        if (!correction) {
          throw notFound('PurchaseCorrection', purchaseId);
        }
        return correction;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to read the purchase correction');
      }
    },
  );

  app.post(
    '/api/v1/purchases/:purchaseId/correct',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = purchaseIdParamsSchema.safeParse(request.params);
      const body = correctPurchaseSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The purchase identifier is not valid',
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
        return await correctPurchaseUseCase(
          {
            organizationId,
            purchaseId: asPurchaseId(params.data.purchaseId),
            correctedByUserId: request.principal.userId,
            reason: body.data.reason,
          },
          { unitOfWork, ids, clock },
        );
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to correct the purchase');
      }
    },
  );

  app.post(
    '/api/v1/purchases/:purchaseId/cancel',
    { config: { permission: 'inventory:write' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = purchaseIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The purchase identifier is not valid',
          params.error,
        );
      }

      try {
        const purchaseId = asPurchaseId(params.data.purchaseId);
        const purchase = await purchases.findById(organizationId, purchaseId);
        if (!purchase) {
          throw notFound('Purchase', purchaseId);
        }

        const at = clock.now();
        cancelPurchase(purchase, at);
        const cancelled = await purchases.markCancelled(organizationId, purchaseId, at);
        if (!cancelled) {
          throw new DomainError('INVALID_STATE', 'Only a draft purchase can be cancelled');
        }
        return cancelled;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to cancel the purchase');
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
