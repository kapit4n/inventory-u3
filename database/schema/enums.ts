/**
 * PostgreSQL enums, defined once.
 *
 * These mirror the domain's enum constants. They live here (and not in the
 * domain) because `pgEnum` is a Drizzle/PostgreSQL concept.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

import { ORGANIZATION_ROLES, PRODUCT_KINDS } from '@inventory-u3/domain';

export const organizationRoleEnum = pgEnum('organization_role', ORGANIZATION_ROLES);
export const productKindEnum = pgEnum('product_kind', PRODUCT_KINDS);

export const DATABASE_ENUM_VALUES = {
  organizationRole: ORGANIZATION_ROLES,
  productKind: PRODUCT_KINDS,
} as const;
