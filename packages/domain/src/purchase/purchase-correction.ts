import type {
  IsoDateTime,
  OrganizationId,
  PurchaseCorrectionId,
  PurchaseId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import type { Purchase } from './purchase.js';

export const PURCHASE_CORRECTION_REASON_MAX_LENGTH = 500;

export interface PurchaseCorrection {
  readonly id: PurchaseCorrectionId;
  readonly organizationId: OrganizationId;
  readonly purchaseId: PurchaseId;
  readonly correctedByUserId: UserId;
  readonly reason: string;
  readonly beforeTotalMinor: number;
  readonly afterTotalMinor: number;
  readonly correctedAt: IsoDateTime;
}

export interface NewPurchaseCorrection {
  readonly id: PurchaseCorrectionId;
  readonly organizationId: OrganizationId;
  readonly purchaseId: PurchaseId;
  readonly correctedByUserId: UserId;
  readonly reason: string;
  readonly beforeTotalMinor: number;
}

export function createPurchaseCorrection(
  input: NewPurchaseCorrection,
  now: IsoDateTime,
): PurchaseCorrection {
  const reason = input.reason.trim();

  if (reason.length === 0 || reason.length > PURCHASE_CORRECTION_REASON_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Correction reason must be between 1 and ${PURCHASE_CORRECTION_REASON_MAX_LENGTH} characters`,
    );
  }

  if (!Number.isSafeInteger(input.beforeTotalMinor) || input.beforeTotalMinor < 0) {
    throw new DomainError('INVALID_INPUT', 'Correction before total must be a non-negative amount');
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    purchaseId: input.purchaseId,
    correctedByUserId: input.correctedByUserId,
    reason,
    beforeTotalMinor: input.beforeTotalMinor,
    afterTotalMinor: 0,
    correctedAt: now,
  };
}

export function correctPurchase(
  purchase: Purchase,
  correction: PurchaseCorrection,
  at: IsoDateTime,
): Purchase {
  if (purchase.status !== 'RECEIVED') {
    throw new DomainError('INVALID_STATE', 'Only a received purchase can be corrected', {
      status: purchase.status,
    });
  }

  if (correction.purchaseId !== purchase.id) {
    throw new DomainError('INVALID_INPUT', 'Correction must reference the purchase it corrects');
  }

  if (correction.beforeTotalMinor !== purchase.totalMinor) {
    throw new DomainError('INVALID_INPUT', 'Correction before total must match the purchase total');
  }

  return {
    ...purchase,
    status: 'CORRECTED',
    correctedByUserId: correction.correctedByUserId,
    correctedAt: at,
    updatedAt: at,
  };
}
