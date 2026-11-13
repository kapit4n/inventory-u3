/**
 * Product-category persistence, on SQLite — the twin of
 * `repositories/product-category-repository.ts`.
 */

import { and, asc, eq } from 'drizzle-orm';

import { productCategories } from '@inventory-u3/database/schema/sqlite';
import type { ProductCategory, ProductCategoryRepository } from '@inventory-u3/domain';
import {
  asOrganizationId,
  asProductCategoryId,
  type IsoDateTime,
  type OrganizationId,
  type ProductCategoryId,
} from '@inventory-u3/types';

import type { SqliteDatabase } from '../connection.js';

type ProductCategoryRow = typeof productCategories.$inferSelect;

export class SQLiteProductCategoryRepository implements ProductCategoryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async findById(
    organizationId: OrganizationId,
    productCategoryId: ProductCategoryId,
  ): Promise<ProductCategory | undefined> {
    const [row] = await this.db
      .select()
      .from(productCategories)
      .where(
        and(
          eq(productCategories.organizationId, organizationId),
          eq(productCategories.id, productCategoryId),
        ),
      )
      .limit(1);

    return row ? toProductCategory(row) : undefined;
  }

  async findByName(
    organizationId: OrganizationId,
    name: string,
  ): Promise<ProductCategory | undefined> {
    const [row] = await this.db
      .select()
      .from(productCategories)
      .where(
        and(eq(productCategories.organizationId, organizationId), eq(productCategories.name, name)),
      )
      .limit(1);

    return row ? toProductCategory(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly ProductCategory[]> {
    const rows = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.organizationId, organizationId))
      .orderBy(asc(productCategories.name), asc(productCategories.id));

    return rows.map(toProductCategory);
  }

  async create(productCategory: ProductCategory): Promise<ProductCategory> {
    const [row] = await this.db
      .insert(productCategories)
      .values({
        id: productCategory.id,
        organizationId: productCategory.organizationId,
        name: productCategory.name,
        isActive: productCategory.isActive,
        createdAt: new Date(productCategory.createdAt),
        updatedAt: new Date(productCategory.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Product category insert did not return a row');
    }

    return toProductCategory(row);
  }

  async update(productCategory: ProductCategory): Promise<ProductCategory | undefined> {
    const [row] = await this.db
      .update(productCategories)
      .set({
        name: productCategory.name,
        isActive: productCategory.isActive,
        updatedAt: new Date(productCategory.updatedAt),
      })
      .where(
        and(
          eq(productCategories.organizationId, productCategory.organizationId),
          eq(productCategories.id, productCategory.id),
        ),
      )
      .returning();

    return row ? toProductCategory(row) : undefined;
  }
}

function toProductCategory(row: ProductCategoryRow): ProductCategory {
  return {
    id: asProductCategoryId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}
