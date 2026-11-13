/**
 * Product-category master data.
 *
 * Categories are organization-wide. Names are unique within the organization
 * because a duplicate category would split one product group across two rows.
 * Categories are deactivated rather than deleted because products reference
 * them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createProductCategory,
  DomainError,
  notFound,
  updateProductCategory,
  type Clock,
  type IdGenerator,
  type ProductCategoryRepository,
} from '@inventory-u3/domain';
import {
  asProductCategoryId,
  type OrganizationId,
  type ProductCategoryId,
} from '@inventory-u3/types';
import {
  createProductCategorySchema,
  productCategoryIdParamsSchema,
  updateProductCategorySchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface ProductCategoryDependencies {
  readonly productCategories: ProductCategoryRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerProductCategoryRoutes(
  app: FastifyInstance,
  { productCategories, clock, ids }: ProductCategoryDependencies,
): Promise<void> {
  app.get(
    '/api/v1/product-categories',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        return { items: await productCategories.listByOrganization(organizationId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list product categories');
      }
    },
  );

  app.post(
    '/api/v1/product-categories',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = createProductCategorySchema.safeParse(request.body);

      if (!parsed.success) {
        return validationProblem(
          reply,
          request,
          'The product category could not be accepted',
          parsed.error,
        );
      }

      try {
        const category = createProductCategory(
          {
            id: asProductCategoryId(ids.nextId()),
            organizationId,
            name: parsed.data.name,
            isActive: parsed.data.isActive,
          },
          clock.now(),
        );

        await assertNameAvailable(productCategories, organizationId, category.name);
        const saved = await productCategories.create(category);
        return reply.status(201).send(saved);
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the product category');
      }
    },
  );

  app.put(
    '/api/v1/product-categories/:categoryId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productCategoryIdParamsSchema.safeParse(request.params);
      const body = updateProductCategorySchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The product category identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(
          reply,
          request,
          'The product category could not be accepted',
          body.error,
        );
      }

      try {
        const categoryId = asProductCategoryId(params.data.categoryId);
        const current = await productCategories.findById(organizationId, categoryId);
        if (!current) {
          throw notFound('Product category', categoryId);
        }

        const next = updateProductCategory(current, body.data, clock.now());
        if (next.name !== current.name) {
          await assertNameAvailable(productCategories, organizationId, next.name, current.id);
        }

        const saved = await productCategories.update(next);
        if (!saved) {
          throw notFound('Product category', categoryId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the product category');
      }
    },
  );
}

async function assertNameAvailable(
  productCategories: ProductCategoryRepository,
  organizationId: OrganizationId,
  name: string,
  currentCategoryId?: ProductCategoryId,
): Promise<void> {
  const existing = await productCategories.findByName(organizationId, name);
  if (existing && existing.id !== currentCategoryId) {
    throw new DomainError('DUPLICATED_RECORD', 'A product category with that name already exists', {
      name,
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
