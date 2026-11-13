/**
 * A product the organization buys, prepares, stocks or sells.
 *
 * M1-T3 makes the raw/processed distinction explicit. Prices and weight
 * snapshots arrive in later tasks. Units are stored as explicit references,
 * never as converted numbers (BQ-10).
 */

import type {
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductCategoryId,
  ProductId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { isProductKind, type ProductKind } from './product-kind.js';

export interface Product {
  readonly id: ProductId;
  readonly organizationId: OrganizationId;
  readonly categoryId: ProductCategoryId;
  readonly name: string;
  /** Raw products are sold as received; processed products are prepared trays. */
  readonly kind: ProductKind;
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
  /** Raw products are sold as received; processed products are prepared trays. */
  readonly kind: ProductKind;
  readonly inventoryUnitId: MeasurementUnitId;
  readonly salesUnitId: MeasurementUnitId;
  readonly purchaseUnitId?: MeasurementUnitId;
  readonly productionUnitId?: MeasurementUnitId;
  readonly isActive?: boolean;
}

export interface UpdateProduct {
  readonly categoryId: ProductCategoryId;
  readonly name: string;
  readonly kind: ProductKind;
  readonly inventoryUnitId: MeasurementUnitId;
  readonly salesUnitId: MeasurementUnitId;
  readonly purchaseUnitId?: MeasurementUnitId;
  readonly productionUnitId?: MeasurementUnitId;
  readonly isActive: boolean;
}

export const PRODUCT_NAME_MAX_LENGTH = 160;

export function createProduct(input: NewProduct, now: IsoDateTime): Product {
  return {
    id: input.id,
    organizationId: input.organizationId,
    ...validatedFields(input),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProduct(product: Product, input: UpdateProduct, now: IsoDateTime): Product {
  return {
    ...product,
    ...validatedFields(input),
    isActive: input.isActive,
    updatedAt: now,
  };
}

function validatedFields(input: Omit<UpdateProduct, 'isActive'>): Omit<UpdateProduct, 'isActive'> {
  const name = input.name.trim();

  if (!isProductKind(input.kind)) {
    throw new DomainError('INVALID_INPUT', 'Product kind must be RAW or PROCESSED');
  }

  if (name.length === 0 || name.length > PRODUCT_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Product name must be between 1 and ${PRODUCT_NAME_MAX_LENGTH} characters`,
    );
  }

  return {
    categoryId: input.categoryId,
    name,
    kind: input.kind,
    inventoryUnitId: input.inventoryUnitId,
    salesUnitId: input.salesUnitId,
    purchaseUnitId: input.purchaseUnitId,
    productionUnitId: input.productionUnitId,
  };
}
