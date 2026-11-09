/**
 * Whether a product is sold as received or prepared by a branch.
 *
 * Raw products use their configured unit directly. Processed products are the
 * ones prepared as trays and configured with an average weight per tray
 * (BR-015, BR-021). The database constraints read this same list.
 */

export const PRODUCT_KINDS = ['RAW', 'PROCESSED'] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number];

export function isProductKind(value: unknown): value is ProductKind {
  return typeof value === 'string' && (PRODUCT_KINDS as readonly string[]).includes(value);
}
