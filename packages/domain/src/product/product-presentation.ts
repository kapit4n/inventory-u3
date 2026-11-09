/**
 * A packaging or presentation of a product, for example a covered tray.
 *
 * The presentation is where processed-product configuration will live. M1-T2
 * only records its identity; average weight per tray is added by M1-T3 so it is
 * not hardcoded or invented here.
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
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewProductPresentation {
  readonly id: ProductPresentationId;
  readonly organizationId: OrganizationId;
  readonly productId: ProductId;
  readonly name: string;
  readonly isActive?: boolean;
}

export const PRODUCT_PRESENTATION_NAME_MAX_LENGTH = 120;

export function createProductPresentation(
  input: NewProductPresentation,
  now: IsoDateTime,
): ProductPresentation {
  const name = input.name.trim();

  if (name.length === 0 || name.length > PRODUCT_PRESENTATION_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Product presentation name must be between 1 and ${PRODUCT_PRESENTATION_NAME_MAX_LENGTH} characters`,
    );
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    productId: input.productId,
    name,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}
