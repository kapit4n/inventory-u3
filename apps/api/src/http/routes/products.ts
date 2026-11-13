/**
 * Product master data.
 *
 * Products belong to the organization and reference a category plus explicit
 * measurement units. The route rejects references that do not belong to the
 * caller's organization before the domain or database sees them.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import {
  createProduct,
  notFound,
  updateProduct,
  type Clock,
  type IdGenerator,
  type MeasurementUnitRepository,
  type ProductCategoryRepository,
  type ProductRepository,
} from '@inventory-u3/domain';
import {
  asMeasurementUnitId,
  asProductCategoryId,
  asProductId,
  type MeasurementUnitId,
  type OrganizationId,
  type ProductCategoryId,
} from '@inventory-u3/types';
import {
  createProductSchema,
  productIdParamsSchema,
  updateProductSchema,
} from '@inventory-u3/validation';

import { sendProblem } from '../problem.js';

export interface ProductDependencies {
  readonly products: ProductRepository;
  readonly productCategories: ProductCategoryRepository;
  readonly measurementUnits: MeasurementUnitRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export async function registerProductRoutes(
  app: FastifyInstance,
  { products, productCategories, measurementUnits, clock, ids }: ProductDependencies,
): Promise<void> {
  app.get(
    '/api/v1/products',
    { config: { permission: 'organization:read' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;

      try {
        return { items: await products.listByOrganization(organizationId) };
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to list products');
      }
    },
  );

  app.post(
    '/api/v1/products',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const parsed = createProductSchema.safeParse(request.body);

      if (!parsed.success) {
        return validationProblem(reply, request, 'The product could not be accepted', parsed.error);
      }

      try {
        const categoryId = asProductCategoryId(parsed.data.categoryId);
        await assertReferencesExist({
          organizationId,
          categoryId,
          categoryRepository: productCategories,
          unitIds: [
            parsed.data.inventoryUnitId,
            parsed.data.salesUnitId,
            parsed.data.purchaseUnitId,
            parsed.data.productionUnitId,
          ],
          unitRepository: measurementUnits,
        });

        const product = createProduct(
          {
            id: asProductId(ids.nextId()),
            organizationId,
            categoryId,
            name: parsed.data.name,
            kind: parsed.data.kind,
            inventoryUnitId: asMeasurementUnitId(parsed.data.inventoryUnitId),
            salesUnitId: asMeasurementUnitId(parsed.data.salesUnitId),
            purchaseUnitId: parsed.data.purchaseUnitId
              ? asMeasurementUnitId(parsed.data.purchaseUnitId)
              : undefined,
            productionUnitId: parsed.data.productionUnitId
              ? asMeasurementUnitId(parsed.data.productionUnitId)
              : undefined,
            isActive: parsed.data.isActive,
          },
          clock.now(),
        );

        return reply.status(201).send(await products.create(product));
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to create the product');
      }
    },
  );

  app.put(
    '/api/v1/products/:productId',
    { config: { permission: 'organization:manage' } },
    async (request, reply) => {
      const organizationId = request.organizationId as OrganizationId;
      const params = productIdParamsSchema.safeParse(request.params);
      const body = updateProductSchema.safeParse(request.body);

      if (!params.success) {
        return validationProblem(
          reply,
          request,
          'The product identifier is not valid',
          params.error,
        );
      }
      if (!body.success) {
        return validationProblem(reply, request, 'The product could not be accepted', body.error);
      }

      try {
        const productId = asProductId(params.data.productId);
        const current = await products.findById(organizationId, productId);
        if (!current) {
          throw notFound('Product', productId);
        }

        const categoryId = asProductCategoryId(body.data.categoryId);
        await assertReferencesExist({
          organizationId,
          categoryId,
          categoryRepository: productCategories,
          unitIds: [
            body.data.inventoryUnitId,
            body.data.salesUnitId,
            body.data.purchaseUnitId,
            body.data.productionUnitId,
          ],
          unitRepository: measurementUnits,
        });

        const next = updateProduct(
          current,
          {
            categoryId,
            name: body.data.name,
            kind: body.data.kind,
            inventoryUnitId: asMeasurementUnitId(body.data.inventoryUnitId),
            salesUnitId: asMeasurementUnitId(body.data.salesUnitId),
            purchaseUnitId: body.data.purchaseUnitId
              ? asMeasurementUnitId(body.data.purchaseUnitId)
              : undefined,
            productionUnitId: body.data.productionUnitId
              ? asMeasurementUnitId(body.data.productionUnitId)
              : undefined,
            isActive: body.data.isActive,
          },
          clock.now(),
        );

        const saved = await products.update(next);
        if (!saved) {
          throw notFound('Product', productId);
        }

        return saved;
      } catch (error) {
        return sendProblem(reply, request, error, 'Failed to update the product');
      }
    },
  );
}

async function assertReferencesExist({
  organizationId,
  categoryId,
  categoryRepository,
  unitIds,
  unitRepository,
}: {
  readonly organizationId: OrganizationId;
  readonly categoryId: ProductCategoryId;
  readonly categoryRepository: ProductCategoryRepository;
  readonly unitIds: readonly (string | undefined)[];
  readonly unitRepository: MeasurementUnitRepository;
}): Promise<void> {
  const category = await categoryRepository.findById(organizationId, categoryId);
  if (!category) {
    throw notFound('Product category', categoryId);
  }

  const uniqueUnitIds = [...new Set(unitIds.filter((id): id is string => Boolean(id)))];
  for (const rawUnitId of uniqueUnitIds) {
    const unitId: MeasurementUnitId = asMeasurementUnitId(rawUnitId);
    const unit = await unitRepository.findById(organizationId, unitId);
    if (!unit) {
      throw notFound('Measurement unit', unitId);
    }
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
