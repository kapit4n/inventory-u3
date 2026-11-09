/**
 * Product persistence, on PostgreSQL.
 *
 * Products are organization-owned master data. Units are stored as explicit
 * references; no conversion is applied here (BQ-10).
 */

import { and, asc, eq } from 'drizzle-orm';

import { products } from '@inventory-u3/database/schema';
import type { Product, ProductRepository } from '@inventory-u3/domain';
import {
  asMeasurementUnitId,
  asOrganizationId,
  asProductCategoryId,
  asProductId,
  type IsoDateTime,
  type MeasurementUnitId,
  type OrganizationId,
  type ProductId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type ProductRow = typeof products.$inferSelect;

export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    productId: ProductId,
  ): Promise<Product | undefined> {
    const [row] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.organizationId, organizationId), eq(products.id, productId)))
      .limit(1);

    return row ? toProduct(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly Product[]> {
    const rows = await this.db
      .select()
      .from(products)
      .where(eq(products.organizationId, organizationId))
      .orderBy(asc(products.name), asc(products.id));

    return rows.map(toProduct);
  }

  async create(product: Product): Promise<Product> {
    const [row] = await this.db
      .insert(products)
      .values({
        id: product.id,
        organizationId: product.organizationId,
        categoryId: product.categoryId,
        name: product.name,
        kind: product.kind,
        inventoryUnitId: product.inventoryUnitId,
        salesUnitId: product.salesUnitId,
        purchaseUnitId: product.purchaseUnitId ?? null,
        productionUnitId: product.productionUnitId ?? null,
        isActive: product.isActive,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Product insert did not return a row');
    }

    return toProduct(row);
  }
}

function toProduct(row: ProductRow): Product {
  return {
    id: asProductId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    categoryId: asProductCategoryId(row.categoryId),
    name: row.name,
    kind: row.kind,
    inventoryUnitId: asMeasurementUnitId(row.inventoryUnitId),
    salesUnitId: asMeasurementUnitId(row.salesUnitId),
    purchaseUnitId: optionalMeasurementUnitId(row.purchaseUnitId),
    productionUnitId: optionalMeasurementUnitId(row.productionUnitId),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}

function optionalMeasurementUnitId(value: string | null): MeasurementUnitId | undefined {
  return value === null ? undefined : asMeasurementUnitId(value);
}
