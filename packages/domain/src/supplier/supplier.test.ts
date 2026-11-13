import { describe, expect, it } from 'vitest';

import { asOrganizationId, asSupplierId, type OrganizationId } from '@inventory-u3/types';

import { SUPPLIER_NAME_MAX_LENGTH, createSupplier, updateSupplier } from './supplier.js';

const NOW = '2026-11-09T12:00:00.000Z';
const ORGANIZATION_ID: OrganizationId = asOrganizationId('11111111-1111-4111-8111-111111111111');
const SUPPLIER_ID = asSupplierId('44444444-4444-4444-8444-444444444444');

describe('createSupplier', () => {
  it('creates an active supplier with a trimmed name and audit timestamps', () => {
    const supplier = createSupplier(
      {
        id: SUPPLIER_ID,
        organizationId: ORGANIZATION_ID,
        name: '  Central Farms  ',
      },
      NOW,
    );

    expect(supplier).toEqual({
      id: SUPPLIER_ID,
      organizationId: ORGANIZATION_ID,
      name: 'Central Farms',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('preserves an explicit inactive state', () => {
    const supplier = createSupplier(
      {
        id: SUPPLIER_ID,
        organizationId: ORGANIZATION_ID,
        name: 'Former Supplier',
        isActive: false,
      },
      NOW,
    );

    expect(supplier.isActive).toBe(false);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(() =>
      createSupplier(
        {
          id: SUPPLIER_ID,
          organizationId: ORGANIZATION_ID,
          name: '   ',
        },
        NOW,
      ),
    ).toThrowError('Supplier name must be between 1 and 160 characters');
  });

  it('rejects a name longer than the allowed maximum', () => {
    expect(() =>
      createSupplier(
        {
          id: SUPPLIER_ID,
          organizationId: ORGANIZATION_ID,
          name: 'a'.repeat(SUPPLIER_NAME_MAX_LENGTH + 1),
        },
        NOW,
      ),
    ).toThrowError('Supplier name must be between 1 and 160 characters');
  });
});

describe('updateSupplier', () => {
  const supplier = createSupplier(
    {
      id: SUPPLIER_ID,
      organizationId: ORGANIZATION_ID,
      name: 'Central Farms',
    },
    NOW,
  );

  it('trims the name, changes active state and advances updatedAt', () => {
    const updated = updateSupplier(
      supplier,
      {
        name: '  Central Farms Produce  ',
        isActive: false,
      },
      '2026-11-09T13:00:00.000Z',
    );

    expect(updated).toEqual({
      ...supplier,
      name: 'Central Farms Produce',
      isActive: false,
      updatedAt: '2026-11-09T13:00:00.000Z',
    });
    expect(updated.createdAt).toBe(supplier.createdAt);
    expect(updated.organizationId).toBe(supplier.organizationId);
    expect(updated.id).toBe(supplier.id);
  });

  it('rejects an empty update name', () => {
    expect(() =>
      updateSupplier(supplier, { name: '   ', isActive: true }, '2026-11-09T13:00:00.000Z'),
    ).toThrowError('Supplier name must be between 1 and 160 characters');
  });

  it('rejects an update name longer than the allowed maximum', () => {
    expect(() =>
      updateSupplier(
        supplier,
        {
          name: 'a'.repeat(SUPPLIER_NAME_MAX_LENGTH + 1),
          isActive: true,
        },
        '2026-11-09T13:00:00.000Z',
      ),
    ).toThrowError('Supplier name must be between 1 and 160 characters');
  });
});
