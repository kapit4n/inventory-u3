/**
 * A packaging or presentation of a product, for example a covered tray.
 *
 * The presentation carries the configured average weight per tray for a
 * processed product. The documented 0.001 kg precision is one gram, so the
 * weight is stored as an exact integer rather than a floating-point kilogram
 * value.
 */

import type {
  IsoDateTime,
  OrganizationId,
  ProductId,
  ProductPresentationId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface ProductPresentation {
  readonly id: ProductPresentationId;
  readonly organizationId: OrganizationId;
  readonly productId: ProductId;
  readonly name: string;
  /** Configured grams per tray; positive and exact. */
  readonly averageWeightGrams: number;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewProductPresentation {
  readonly id: ProductPresentationId;
  readonly organizationId: OrganizationId;
  readonly productId: ProductId;
  readonly name: string;
  readonly averageWeightGrams: number;
  readonly isActive?: boolean;
}

export interface UpdateProductPresentation {
  readonly name: string;
  readonly averageWeightGrams: number;
  readonly isActive: boolean;
}

export const PRODUCT_PRESENTATION_NAME_MAX_LENGTH = 120;

export function createProductPresentation(
  input: NewProductPresentation,
  now: IsoDateTime,
): ProductPresentation {
  return {
    id: input.id,
    organizationId: input.organizationId,
    productId: input.productId,
    ...validatedFields(input),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProductPresentation(
  productPresentation: ProductPresentation,
  input: UpdateProductPresentation,
  now: IsoDateTime,
): ProductPresentation {
  return {
    ...productPresentation,
    ...validatedFields(input),
    isActive: input.isActive,
    updatedAt: now,
  };
}

function validatedFields(input: { readonly name: string; readonly averageWeightGrams: number }): {
  readonly name: string;
  readonly averageWeightGrams: number;
} {
  const name = input.name.trim();

  if (name.length === 0 || name.length > PRODUCT_PRESENTATION_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Product presentation name must be between 1 and ${PRODUCT_PRESENTATION_NAME_MAX_LENGTH} characters`,
    );
  }

  if (!Number.isSafeInteger(input.averageWeightGrams) || input.averageWeightGrams <= 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'Product presentation average weight must be a positive whole number of grams',
    );
  }

  return { name, averageWeightGrams: input.averageWeightGrams };
}
