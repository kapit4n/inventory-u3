/**
 * The organization is the tenant. Every user, session and future inventory row
 * belongs to exactly one organization, and every read is scoped by its id.
 */

import type { IsoDateTime, OrganizationId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface Organization {
  readonly id: OrganizationId;
  readonly name: string;
  readonly timezone: string;
  readonly currency: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface OrganizationSettingsUpdate {
  readonly name: string;
  readonly timezone: string;
  readonly currency: string;
}

const NAME_MAX_LENGTH = 120;

export function updateOrganizationSettings(
  organization: Organization,
  update: OrganizationSettingsUpdate,
  at: IsoDateTime,
): Organization {
  const name = update.name.trim();
  if (name.length === 0 || name.length > NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Organization name must be between 1 and ${NAME_MAX_LENGTH} characters`,
    );
  }

  if (update.timezone.trim().length === 0) {
    throw new DomainError('INVALID_INPUT', 'Timezone is required');
  }

  if (!/^[A-Z]{3}$/.test(update.currency)) {
    throw new DomainError('INVALID_INPUT', 'Currency must be a three-letter ISO code');
  }

  return {
    ...organization,
    name,
    timezone: update.timezone,
    currency: update.currency,
    updatedAt: at,
  };
}
