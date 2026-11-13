/**
 * A grouping for products, such as fruit, vegetables or prepared trays.
 *
 * Categories are organization-wide master data; branch-specific assortments and
 * prices are not modelled yet (BQ-06).
 */

import type { IsoDateTime, OrganizationId, ProductCategoryId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface ProductCategory {
  readonly id: ProductCategoryId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewProductCategory {
  readonly id: ProductCategoryId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly isActive?: boolean;
}

export interface UpdateProductCategory {
  readonly name: string;
  readonly isActive: boolean;
}

export const PRODUCT_CATEGORY_NAME_MAX_LENGTH = 120;

export function createProductCategory(
  input: NewProductCategory,
  now: IsoDateTime,
): ProductCategory {
  return {
    id: input.id,
    organizationId: input.organizationId,
    name: validatedName(input.name),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductCategory(
  productCategory: ProductCategory,
  input: UpdateProductCategory,
  now: IsoDateTime,
): ProductCategory {
  return {
    ...productCategory,
    name: validatedName(input.name),
    isActive: input.isActive,
    updatedAt: now,
  };
}

function validatedName(value: string): string {
  const name = value.trim();

  if (name.length === 0 || name.length > PRODUCT_CATEGORY_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Product category name must be between 1 and ${PRODUCT_CATEGORY_NAME_MAX_LENGTH} characters`,
    );
  }

  return name;
}
