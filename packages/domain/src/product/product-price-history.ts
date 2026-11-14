/**
 * Effective-dated selling prices for a product.
 *
 * A price row is append-only: changing a price adds a new row with the date it
 * starts applying. Existing rows are never rewritten, so the price used by a
 * past sales checkpoint can always be reconstructed.
 *
 * Prices are organization-wide for now (BQ-06). The price basis is stored on
 * the row rather than read from the product later, because an editable
 * raw/processed kind must not silently reinterpret historical prices.
 */

import type {
  IsoDate,
  IsoDateTime,
  OrganizationId,
  ProductId,
  ProductPriceHistoryId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { isProductKind, type ProductKind } from './product-kind.js';

export const PRODUCT_PRICE_BASES = ['PER_KILOGRAM', 'PER_SALES_UNIT'] as const;

export type ProductPriceBasis = (typeof PRODUCT_PRICE_BASES)[number];

export interface ProductPriceHistory {
  readonly id: ProductPriceHistoryId;
  readonly organizationId: OrganizationId;
  readonly productId: ProductId;
  /** Integer amount in the currency's minor unit. */
  readonly amountMinor: number;
  /** ISO-4217 code captured with the amount. */
  readonly currency: string;
  readonly priceBasis: ProductPriceBasis;
  /** First business date on which this price applies. */
  readonly effectiveFrom: IsoDate;
  readonly createdAt: IsoDateTime;
}

export interface NewProductPriceHistory {
  readonly id: ProductPriceHistoryId;
  readonly organizationId: OrganizationId;
  readonly productId: ProductId;
  readonly amountMinor: number;
  readonly currency: string;
  readonly priceBasis: ProductPriceBasis;
  readonly effectiveFrom: IsoDate;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isProductPriceBasis(value: unknown): value is ProductPriceBasis {
  return typeof value === 'string' && (PRODUCT_PRICE_BASES as readonly string[]).includes(value);
}

export function priceBasisForProductKind(kind: ProductKind): ProductPriceBasis {
  if (!isProductKind(kind)) {
    throw new DomainError('INVALID_INPUT', 'Product kind must be RAW or PROCESSED');
  }
  return kind === 'PROCESSED' ? 'PER_KILOGRAM' : 'PER_SALES_UNIT';
}

export function createProductPriceHistory(
  input: NewProductPriceHistory,
  now: IsoDateTime,
): ProductPriceHistory {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'Selling price must be a non-negative whole number in minor units',
    );
  }

  if (!CURRENCY_PATTERN.test(input.currency)) {
    throw new DomainError('INVALID_INPUT', 'Selling price currency must be a three-letter code');
  }

  if (!isProductPriceBasis(input.priceBasis)) {
    throw new DomainError('INVALID_INPUT', 'Selling price basis must be per kilogram or per unit');
  }

  if (!isValidIsoDate(input.effectiveFrom)) {
    throw new DomainError('INVALID_INPUT', 'Selling price effective date must be a valid date');
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    productId: input.productId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    priceBasis: input.priceBasis,
    effectiveFrom: input.effectiveFrom,
    createdAt: now,
  };
}

function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
