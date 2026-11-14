/**
 * Product selling-price history, on PostgreSQL.
 *
 * Rows are append-only and ordered newest effective date first. The price basis
 * is captured on the row; it is never derived from the current product kind.
 */

import { and, desc, eq } from 'drizzle-orm';

import { productPriceHistory } from '@inventory-u3/database/schema';
import type { ProductPriceHistory, ProductPriceHistoryRepository } from '@inventory-u3/domain';
import {
  asOrganizationId,
  asProductId,
  asProductPriceHistoryId,
  type IsoDate,
  type IsoDateTime,
  type OrganizationId,
  type ProductId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type ProductPriceHistoryRow = typeof productPriceHistory.$inferSelect;

export class DrizzleProductPriceHistoryRepository implements ProductPriceHistoryRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findByProductAndEffectiveFrom(
    organizationId: OrganizationId,
    productId: ProductId,
    effectiveFrom: IsoDate,
  ): Promise<ProductPriceHistory | undefined> {
    const [row] = await this.db
      .select()
      .from(productPriceHistory)
      .where(
        and(
          eq(productPriceHistory.organizationId, organizationId),
          eq(productPriceHistory.productId, productId),
          eq(productPriceHistory.effectiveFrom, effectiveFrom),
        ),
      )
      .limit(1);

    return row ? toProductPriceHistory(row) : undefined;
  }

  async listByProduct(
    organizationId: OrganizationId,
    productId: ProductId,
  ): Promise<readonly ProductPriceHistory[]> {
    const rows = await this.db
      .select()
      .from(productPriceHistory)
      .where(
        and(
          eq(productPriceHistory.organizationId, organizationId),
          eq(productPriceHistory.productId, productId),
        ),
      )
      .orderBy(
        desc(productPriceHistory.effectiveFrom),
        desc(productPriceHistory.createdAt),
        desc(productPriceHistory.id),
      );

    return rows.map(toProductPriceHistory);
  }

  async create(productPrice: ProductPriceHistory): Promise<ProductPriceHistory> {
    const [row] = await this.db
      .insert(productPriceHistory)
      .values({
        id: productPrice.id,
        organizationId: productPrice.organizationId,
        productId: productPrice.productId,
        amountMinor: productPrice.amountMinor,
        currency: productPrice.currency,
        priceBasis: productPrice.priceBasis,
        effectiveFrom: productPrice.effectiveFrom,
        createdAt: new Date(productPrice.createdAt),
      })
      .returning();

    if (!row) {
      throw new Error('Product price insert did not return a row');
    }

    return toProductPriceHistory(row);
  }
}

function toProductPriceHistory(row: ProductPriceHistoryRow): ProductPriceHistory {
  return {
    id: asProductPriceHistoryId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    productId: asProductId(row.productId),
    amountMinor: row.amountMinor,
    currency: row.currency,
    priceBasis: row.priceBasis,
    effectiveFrom: row.effectiveFrom as IsoDate,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
  };
}
