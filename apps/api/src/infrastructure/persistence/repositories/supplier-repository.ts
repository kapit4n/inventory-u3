/**
 * Supplier persistence, on PostgreSQL.
 *
 * Every read takes the organization id explicitly. Suppliers are organization
 * master data; a later purchase, not the supplier, carries the branch.
 */

import { and, asc, eq } from 'drizzle-orm';

import { suppliers } from '@inventory-u3/database/schema';
import type { Supplier, SupplierRepository } from '@inventory-u3/domain';
import {
  asOrganizationId,
  asSupplierId,
  type IsoDateTime,
  type OrganizationId,
  type SupplierId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type SupplierRow = typeof suppliers.$inferSelect;

export class DrizzleSupplierRepository implements SupplierRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    supplierId: SupplierId,
  ): Promise<Supplier | undefined> {
    const [row] = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.organizationId, organizationId), eq(suppliers.id, supplierId)))
      .limit(1);

    return row ? toSupplier(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly Supplier[]> {
    const rows = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.organizationId, organizationId))
      .orderBy(asc(suppliers.name), asc(suppliers.id));

    return rows.map(toSupplier);
  }

  async create(supplier: Supplier): Promise<Supplier> {
    const [row] = await this.db
      .insert(suppliers)
      .values({
        id: supplier.id,
        organizationId: supplier.organizationId,
        name: supplier.name,
        isActive: supplier.isActive,
        createdAt: new Date(supplier.createdAt),
        updatedAt: new Date(supplier.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Supplier insert did not return a row');
    }

    return toSupplier(row);
  }

  async update(supplier: Supplier): Promise<Supplier | undefined> {
    const [row] = await this.db
      .update(suppliers)
      .set({
        name: supplier.name,
        isActive: supplier.isActive,
        updatedAt: new Date(supplier.updatedAt),
      })
      .where(
        and(eq(suppliers.organizationId, supplier.organizationId), eq(suppliers.id, supplier.id)),
      )
      .returning();

    return row ? toSupplier(row) : undefined;
  }
}

function toSupplier(row: SupplierRow): Supplier {
  return {
    id: asSupplierId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}
