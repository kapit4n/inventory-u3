/**
 * PostgreSQL enums, defined once.
 *
 * These mirror the domain's enum constants. They live here (and not in the
 * domain) because `pgEnum` is a Drizzle/PostgreSQL concept.
 */

import { pgEnum } from 'drizzle-orm/pg-core';

import {
  ORGANIZATION_ROLES,
  PRODUCT_KINDS,
  PRODUCT_PRICE_BASES,
  PRODUCTION_STATUSES,
  PRODUCTION_WEIGHT_BASES,
  PURCHASE_STATUSES,
  SALES_CHECKPOINT_PERIODS,
  SALES_CHECKPOINT_STATUSES,
  SALES_CHECKPOINT_WEIGHT_BASES,
  STOCK_ADJUSTMENT_KINDS,
  STOCK_MOVEMENT_REASONS,
  STOCK_MOVEMENT_SOURCE_TYPES,
} from '@inventory-u3/domain';

export const organizationRoleEnum = pgEnum('organization_role', ORGANIZATION_ROLES);
export const productKindEnum = pgEnum('product_kind', PRODUCT_KINDS);
export const productPriceBasisEnum = pgEnum('product_price_basis', PRODUCT_PRICE_BASES);
export const purchaseStatusEnum = pgEnum('purchase_status', PURCHASE_STATUSES);
export const productionStatusEnum = pgEnum('production_status', PRODUCTION_STATUSES);
export const productionWeightBasisEnum = pgEnum('production_weight_basis', PRODUCTION_WEIGHT_BASES);
export const salesCheckpointStatusEnum = pgEnum(
  'sales_checkpoint_status',
  SALES_CHECKPOINT_STATUSES,
);
export const salesCheckpointPeriodEnum = pgEnum(
  'sales_checkpoint_period',
  SALES_CHECKPOINT_PERIODS,
);
export const salesCheckpointWeightBasisEnum = pgEnum(
  'sales_checkpoint_weight_basis',
  SALES_CHECKPOINT_WEIGHT_BASES,
);
export const stockAdjustmentKindEnum = pgEnum('stock_adjustment_kind', STOCK_ADJUSTMENT_KINDS);
export const stockMovementReasonEnum = pgEnum('stock_movement_reason', STOCK_MOVEMENT_REASONS);
export const stockMovementSourceTypeEnum = pgEnum(
  'stock_movement_source_type',
  STOCK_MOVEMENT_SOURCE_TYPES,
);

export const DATABASE_ENUM_VALUES = {
  organizationRole: ORGANIZATION_ROLES,
  productKind: PRODUCT_KINDS,
  productPriceBasis: PRODUCT_PRICE_BASES,
  purchaseStatus: PURCHASE_STATUSES,
  productionStatus: PRODUCTION_STATUSES,
  productionWeightBasis: PRODUCTION_WEIGHT_BASES,
  salesCheckpointStatus: SALES_CHECKPOINT_STATUSES,
  salesCheckpointPeriod: SALES_CHECKPOINT_PERIODS,
  salesCheckpointWeightBasis: SALES_CHECKPOINT_WEIGHT_BASES,
  stockAdjustmentKind: STOCK_ADJUSTMENT_KINDS,
  stockMovementReason: STOCK_MOVEMENT_REASONS,
  stockMovementSourceType: STOCK_MOVEMENT_SOURCE_TYPES,
} as const;
