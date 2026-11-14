/**
 * Product selling-price history.
 *
 * Prices are organization-wide and append-only (BQ-06 working assumption). A
 * price change is a new effective-dated row; there is no update or delete
 * route, so past prices remain available to later sales snapshots.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createProductPriceHistory,
  DomainError,
  notFound,
  priceBasisForProductKind,
  type Clock,
  type IdGenerator,
  type OrganizationRepository,
  type ProductPriceHistoryRepository,
  type ProductRepository,
} from '@inventory-u3/domain';
import {
  asProductId,
  asProductPriceHistoryId,
  type OrganizationId,
  type ProductId,
} from '@inventory-u3/types';
import { createProductPriceHistorySchema, productIdParamsSchema } from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface ProductPriceHistoryDependencies {
  readonly productPriceHistory: ProductPriceHistoryRepository;
  readonly products: ProductRepository;
  readonly organizations: OrganizationRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerProductPriceHistoryRoutes(
  app: FastifyInstance,
  { productPriceHistory, products, organizations, clock, ids }: ProductPriceHistoryDependencies,
): Promise<void> {
  app.get(
    '/api/v1/products/:productId/prices',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productIdParamsSchema.safeParse(request.params);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The product identifier is not valid',
          params.error,
        );
      }

      try {
        const productId = asProductId(params.data.productId);
        await assertProductExists(products, organizationId, productId);
        const organization = await organizations.findById(organizationId);
        if (!organization) {
          throw notFound('Organization', organizationId);
        }

        return {
          items: await productPriceHistory.listByProduct(organizationId, productId),
          currency: organization.currency,
        };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list product prices');
      }
    },
  );

  app.post(
    '/api/v1/products/:productId/prices',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productIdParamsSchema.safeParse(request.params);
      const body = createProductPriceHistorySchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The product identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The product price could not be accepted',
          body.error,
        );
      }

      try {
        const productId = asProductId(params.data.productId);
        const product = await products.findById(organizationId, productId);
        if (!product) {
          throw notFound('Product', productId);
        }

        const organization = await organizations.findById(organizationId);
        if (!organization) {
          throw notFound('Organization', organizationId);
        }

        const price = createProductPriceHistory(
          {
            id: asProductPriceHistoryId(ids.nextId()),
            organizationId,
            productId,
            amountMinor: body.data.amountMinor,
            currency: organization.currency,
            priceBasis: priceBasisForProductKind(product.kind),
            effectiveFrom: body.data.effectiveFrom,
          },
          clock.now(),
        );

        const existing = await productPriceHistory.findByProductAndEffectiveFrom(
          organizationId,
          productId,
          price.effectiveFrom,
        );
        if (existing) {
          throw new DomainError(
            'DUPLICATED_RECORD',
            'A price with that effective date already exists for this product',
            { effectiveFrom: price.effectiveFrom },
          );
        }

        return reply.status(201).send(await productPriceHistory.create(price));
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the product price');
      }
    },
  );
}

async function assertProductExists(
  products: ProductRepository,
  organizationId: OrganizationId,
  productId: ProductId,
): Promise<void> {
  const product = await products.findById(organizationId, productId);
  if (!product) {
    throw notFound('Product', productId);
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
