/**
 * A product the organization buys, prepares, stocks or sells.
 *
 * M1-T2 records the master-data identity and the units attached to it. The
 * raw/processed distinction, average weight and prices arrive in later tasks;
 * this entity deliberately leaves room for them without pretending to know
 * their rules yet. Units are stored as explicit references, never as converted
 * numbers (BQ-10).
 */

import type {
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductCategoryId,
  ProductId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface Product {
  readonly id: ProductId;
  readonly organizationId: OrganizationId;
  readonly categoryId: ProductCategoryId;
  readonly name: string;
  /** Unit stock is counted in. */
  readonly inventoryUnitId: MeasurementUnitId;
  /** Unit used in a sales checkpoint: kilogram, unit or tray. */
  readonly salesUnitId: MeasurementUnitId;
  /** Unit a supplier sells in, when the product is purchased. */
  readonly purchaseUnitId?: MeasurementUnitId;
  /** Unit production output is reported in, when the product is prepared. */
  readonly productionUnitId?: MeasurementUnitId;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewProduct {
  readonly id: ProductId;
  readonly organizationId: OrganizationId;
  readonly categoryId: ProductCategoryId;
  readonly name: string;
  readonly inventoryUnitId: MeasurementUnitId;
  readonly salesUnitId: MeasurementUnitId;
  readonly purchaseUnitId?: MeasurementUnitId;
  readonly productionUnitId?: MeasurementUnitId;
  readonly isActive?: boolean;
}

export const PRODUCT_NAME_MAX_LENGTH = 160;

export function createProduct(input: NewProduct, now: IsoDateTime): Product {
  const name = input.name.trim();

  if (name.length === 0 || name.length > PRODUCT_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Product name must be between 1 and ${PRODUCT_NAME_MAX_LENGTH} characters`,
    );
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    categoryId: input.categoryId,
    name,
    inventoryUnitId: input.inventoryUnitId,
    salesUnitId: input.salesUnitId,
    purchaseUnitId: input.purchaseUnitId,
    productionUnitId: input.productionUnitId,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}
