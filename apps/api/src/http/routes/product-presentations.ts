/**
 * Product-presentation master data.
 *
 * A presentation belongs to one product, so every route is nested under that
 * product. Names are unique within the product; the configured average weight is
 * integer grams. Presentations are deactivated rather than deleted because
 * production and sales records will reference them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createProductPresentation,
  DomainError,
  notFound,
  updateProductPresentation,
  type Clock,
  type IdGenerator,
  type ProductPresentationRepository,
  type ProductRepository,
} from '@inventory-u3/domain';
import {
  asProductId,
  asProductPresentationId,
  type OrganizationId,
  type ProductId,
  type ProductPresentationId,
} from '@inventory-u3/types';
import {
  createProductPresentationSchema,
  productIdParamsSchema,
  productPresentationParamsSchema,
  updateProductPresentationSchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface ProductPresentationDependencies {
  readonly productPresentations: ProductPresentationRepository;
  readonly products: ProductRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerProductPresentationRoutes(
  app: FastifyInstance,
  { productPresentations, products, clock, ids }: ProductPresentationDependencies,
): Promise<void> {
  app.get(
    '/api/v1/products/:productId/presentations',
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
        return { items: await productPresentations.listByProduct(organizationId, productId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list product presentations');
      }
    },
  );

  app.post(
    '/api/v1/products/:productId/presentations',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productIdParamsSchema.safeParse(request.params);
      const body = createProductPresentationSchema.safeParse(request.body);

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
          'The product presentation could not be accepted',
          body.error,
        );
      }

      try {
        const productId = asProductId(params.data.productId);
        await assertProductExists(products, organizationId, productId);

        const presentation = createProductPresentation(
          {
            id: asProductPresentationId(ids.nextId()),
            organizationId,
            productId,
            name: body.data.name,
            averageWeightGrams: body.data.averageWeightGrams,
            isActive: body.data.isActive,
          },
          clock.now(),
        );

        await assertNameAvailable(
          productPresentations,
          organizationId,
          productId,
          presentation.name,
        );
        const saved = await productPresentations.create(presentation);
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the product presentation');
      }
    },
  );

  app.put(
    '/api/v1/products/:productId/presentations/:presentationId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productPresentationParamsSchema.safeParse(request.params);
      const body = updateProductPresentationSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The product presentation identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The product presentation could not be accepted',
          body.error,
        );
      }

      try {
        const productId = asProductId(params.data.productId);
        await assertProductExists(products, organizationId, productId);

        const presentationId = asProductPresentationId(params.data.presentationId);
        const current = await productPresentations.findById(organizationId, presentationId);
        if (!current || current.productId !== productId) {
          throw notFound('Product presentation', presentationId);
        }

        const next = updateProductPresentation(current, body.data, clock.now());
        if (next.name !== current.name) {
          await assertNameAvailable(
            productPresentations,
            organizationId,
            productId,
            next.name,
            current.id,
          );
        }

        const saved = await productPresentations.update(next);
        if (!saved) {
          throw notFound('Product presentation', presentationId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the product presentation');
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

async function assertNameAvailable(
  productPresentations: ProductPresentationRepository,
  organizationId: OrganizationId,
  productId: ProductId,
  name: string,
  currentPresentationId?: ProductPresentationId,
): Promise<void> {
  const existing = await productPresentations.findByProductAndName(organizationId, productId, name);
  if (existing && existing.id !== currentPresentationId) {
    throw new DomainError(
      'DUPLICATED_RECORD',
      'A product presentation with that name already exists for this product',
      { name },
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
