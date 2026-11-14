import type {
  BranchId,
  IsoDate,
  IsoDateTime,
  MeasurementUnitId,
  OrganizationId,
  ProductId,
  PurchaseId,
  PurchaseItemId,
  SupplierId,
  UserId,
} from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';
import { isValidIsoDate } from '../shared/time.js';

export const PURCHASE_STATUSES = ['DRAFT', 'RECEIVED', 'CANCELLED', 'CORRECTED'] as const;

export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

export const QUANTITY_SCALE = 1000;

export const PURCHASE_NOTE_MAX_LENGTH = 500;

export interface PurchaseItem {
  readonly id: PurchaseItemId;
  readonly organizationId: OrganizationId;
  readonly purchaseId: PurchaseId;
  readonly productId: ProductId;
  readonly unitId: MeasurementUnitId;
  readonly quantityMilli: number;
  readonly unitPriceMinor: number;
  readonly lineTotalMinor: number;
  readonly position: number;
  readonly createdAt: IsoDateTime;
}

export interface NewPurchaseItem {
  readonly id: PurchaseItemId;
  readonly productId: ProductId;
  readonly unitId: MeasurementUnitId;
  readonly quantityMilli: number;
  readonly unitPriceMinor: number;
}

export interface Purchase {
  readonly id: PurchaseId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly supplierId: SupplierId;
  readonly status: PurchaseStatus;
  readonly deliveryDate: IsoDate;
  readonly currency: string;
  readonly totalMinor: number;
  readonly note?: string;
  readonly createdByUserId: UserId;
  readonly receivedByUserId?: UserId;
  readonly receivedAt?: IsoDateTime;
  readonly cancelledAt?: IsoDateTime;
  readonly correctedByUserId?: UserId;
  readonly correctedAt?: IsoDateTime;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly items: readonly PurchaseItem[];
}

export interface NewPurchase {
  readonly id: PurchaseId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly supplierId: SupplierId;
  readonly deliveryDate: IsoDate;
  readonly currency: string;
  readonly note?: string;
  readonly createdByUserId: UserId;
  readonly items: readonly NewPurchaseItem[];
}

export interface PurchaseReceipt {
  readonly receivedByUserId: UserId;
  readonly receivedAt: IsoDateTime;
}

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export function isPurchaseStatus(value: unknown): value is PurchaseStatus {
  return typeof value === 'string' && (PURCHASE_STATUSES as readonly string[]).includes(value);
}

export function quantityMilliToNumber(quantityMilli: number): number {
  return quantityMilli / QUANTITY_SCALE;
}

export function createPurchase(input: NewPurchase, now: IsoDateTime): Purchase {
  if (!CURRENCY_PATTERN.test(input.currency)) {
    throw new DomainError('INVALID_INPUT', 'Purchase currency must be a three-letter code');
  }

  if (!isValidIsoDate(input.deliveryDate)) {
    throw new DomainError('INVALID_INPUT', 'Purchase delivery date must be a valid date');
  }

  if (input.items.length === 0) {
    throw new DomainError('INVALID_INPUT', 'A purchase must have at least one item');
  }

  const seenItemIds = new Set<string>();
  const items = input.items.map((item, index) => {
    if (seenItemIds.has(item.id)) {
      throw new DomainError('INVALID_INPUT', 'A purchase item identifier must be unique', {
        itemId: item.id,
      });
    }
    seenItemIds.add(item.id);
    return createPurchaseItem(item, input, index + 1, now);
  });

  const totalMinor = items.reduce((total, item) => total + item.lineTotalMinor, 0);
  if (!Number.isSafeInteger(totalMinor)) {
    throw new DomainError('INVALID_INPUT', 'Purchase total is too large');
  }

  const note = input.note?.trim();

  if (note !== undefined && note.length > PURCHASE_NOTE_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Purchase note must be between 1 and ${PURCHASE_NOTE_MAX_LENGTH} characters`,
    );
  }

  return {
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    supplierId: input.supplierId,
    status: 'DRAFT',
    deliveryDate: input.deliveryDate,
    currency: input.currency,
    totalMinor,
    ...(note === undefined || note.length === 0 ? {} : { note }),
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
    items,
  };
}

export function receivePurchase(purchase: Purchase, receipt: PurchaseReceipt): Purchase {
  if (purchase.status !== 'DRAFT') {
    throw new DomainError('INVALID_STATE', 'Only a draft purchase can be received', {
      status: purchase.status,
    });
  }

  return {
    ...purchase,
    status: 'RECEIVED',
    receivedByUserId: receipt.receivedByUserId,
    receivedAt: receipt.receivedAt,
    updatedAt: receipt.receivedAt,
  };
}

export function cancelPurchase(purchase: Purchase, at: IsoDateTime): Purchase {
  if (purchase.status !== 'DRAFT') {
    throw new DomainError('INVALID_STATE', 'Only a draft purchase can be cancelled', {
      status: purchase.status,
    });
  }

  return {
    ...purchase,
    status: 'CANCELLED',
    cancelledAt: at,
    updatedAt: at,
  };
}

function createPurchaseItem(
  item: NewPurchaseItem,
  purchase: NewPurchase,
  position: number,
  now: IsoDateTime,
): PurchaseItem {
  if (!Number.isSafeInteger(item.quantityMilli) || item.quantityMilli <= 0) {
    throw new DomainError('INVALID_INPUT', 'Purchase quantity must be a positive thousandth', {
      itemId: item.id,
    });
  }

  if (!Number.isSafeInteger(item.unitPriceMinor) || item.unitPriceMinor < 0) {
    throw new DomainError(
      'INVALID_INPUT',
      'Purchase unit price must be a non-negative whole number in minor units',
      { itemId: item.id },
    );
  }

  const product = item.quantityMilli * item.unitPriceMinor;
  if (!Number.isSafeInteger(product)) {
    throw new DomainError('INVALID_INPUT', 'Purchase line total is too large', {
      itemId: item.id,
    });
  }

  return {
    id: item.id,
    organizationId: purchase.organizationId,
    purchaseId: purchase.id,
    productId: item.productId,
    unitId: item.unitId,
    quantityMilli: item.quantityMilli,
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: Math.floor((product + QUANTITY_SCALE / 2) / QUANTITY_SCALE),
    position,
    createdAt: now,
  };
}
