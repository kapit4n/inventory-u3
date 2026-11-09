/**
 * Product-presentation persistence, on SQLite — the twin of
 * `repositories/product-presentation-repository.ts`.
 */

import { and, asc, eq } from 'drizzle-orm';

import { productPresentations } from '@inventory-u3/database/schema/sqlite';
import type { ProductPresentation, ProductPresentationRepository } from '@inventory-u3/domain';
import {
  asOrganizationId,
  asProductId,
  asProductPresentationId,
  type IsoDateTime,
  type OrganizationId,
  type ProductId,
  type ProductPresentationId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type ProductPresentationRow = typeof productPresentations.$inferSelect;

export class SQLiteProductPresentationRepository implements ProductPresentationRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(
    organizationId: OrganizationId,
    productPresentationId: ProductPresentationId,
  ): Promise<ProductPresentation | undefined> {
    const [row] = await this.db
      .select()
      .from(productPresentations)
      .where(
        and(
          eq(productPresentations.organizationId, organizationId),
          eq(productPresentations.id, productPresentationId),
        ),
      )
      .limit(1);

    return row ? toProductPresentation(row) : undefined;
  }

  async listByProduct(
    organizationId: OrganizationId,
    productId: ProductId,
  ): Promise<readonly ProductPresentation[]> {
    const rows = await this.db
      .select()
      .from(productPresentations)
      .where(
        and(
          eq(productPresentations.organizationId, organizationId),
          eq(productPresentations.productId, productId),
        ),
      )
      .orderBy(asc(productPresentations.name), asc(productPresentations.id));

    return rows.map(toProductPresentation);
  }

  async create(productPresentation: ProductPresentation): Promise<ProductPresentation> {
    const [row] = await this.db
      .insert(productPresentations)
      .values({
        id: productPresentation.id,
        organizationId: productPresentation.organizationId,
        productId: productPresentation.productId,
        name: productPresentation.name,
        averageWeightGrams: productPresentation.averageWeightGrams,
        isActive: productPresentation.isActive,
        createdAt: new Date(productPresentation.createdAt),
        updatedAt: new Date(productPresentation.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Product presentation insert did not return a row');
    }

    return toProductPresentation(row);
  }
}

function toProductPresentation(row: ProductPresentationRow): ProductPresentation {
  return {
    id: asProductPresentationId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    productId: asProductId(row.productId),
    name: row.name,
    averageWeightGrams: row.averageWeightGrams,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}
