import { DomainError } from '../shared/errors.js';

export const STOCK_REASON_MAX_LENGTH = 500;
export const STOCK_NOTE_MAX_LENGTH = 500;

export function normalizeStockReason(reason: string): string {
  const normalized = reason.trim();

  if (normalized.length === 0 || normalized.length > STOCK_REASON_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Stock reason must be between 1 and ${STOCK_REASON_MAX_LENGTH} characters`,
    );
  }

  return normalized;
}

export function normalizeStockNote(note: string | undefined): string | undefined {
  const normalized = note?.trim();

  if (normalized !== undefined && normalized.length > STOCK_NOTE_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Stock note must be between 1 and ${STOCK_NOTE_MAX_LENGTH} characters`,
    );
  }

  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

export function assertStockInteger(quantityMilli: number, field: string): void {
  if (!Number.isSafeInteger(quantityMilli)) {
    throw new DomainError('INVALID_INPUT', `${field} must be an integer in thousandths`);
  }
}
