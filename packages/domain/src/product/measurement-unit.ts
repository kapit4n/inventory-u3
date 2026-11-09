/**
 * A measurement unit the organization uses for purchases, inventory, production
 * or sales.
 *
 * Units are organization-owned master data because BR-014 requires more than a
 * fixed enumeration: the business may add another configured unit. The entity
 * deliberately carries no conversion factor. BQ-10 is still open, so the system
 * records which unit a quantity uses rather than silently converting it.
 */

import type { IsoDateTime, MeasurementUnitId, OrganizationId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface MeasurementUnit {
  readonly id: MeasurementUnitId;
  readonly organizationId: OrganizationId;
  /** Stable short code, e.g. `kg`, `unit` or `tray`. Unique per organization. */
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewMeasurementUnit {
  readonly id: MeasurementUnitId;
  readonly organizationId: OrganizationId;
  readonly code: string;
  readonly name: string;
  readonly isActive?: boolean;
}

export const MEASUREMENT_UNIT_CODE_MAX_LENGTH = 32;
export const MEASUREMENT_UNIT_NAME_MAX_LENGTH = 80;

export function createMeasurementUnit(
  input: NewMeasurementUnit,
  now: IsoDateTime,
): MeasurementUnit {
  const code = input.code.trim();
  const name = input.name.trim();

  if (code.length === 0 || code.length > MEASUREMENT_UNIT_CODE_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Measurement unit code must be between 1 and ${MEASUREMENT_UNIT_CODE_MAX_LENGTH} characters`,
    );
  }

  if (name.length === 0 || name.length > MEASUREMENT_UNIT_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Measurement unit name must be between 1 and ${MEASUREMENT_UNIT_NAME_MAX_LENGTH} characters`,
    );
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    code,
    name,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}
