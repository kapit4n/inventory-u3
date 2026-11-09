import { describe, expect, it } from 'vitest';

import {
  asBranchId,
  asEmployeeId,
  asOrganizationId,
  type BranchId,
  type OrganizationId,
} from '@inventory-u3/types';

import { EMPLOYEE_NAME_MAX_LENGTH, createEmployee, updateEmployee } from './employee.js';

const NOW = '2026-11-09T12:00:00.000Z';
const ORGANIZATION_ID: OrganizationId = asOrganizationId('11111111-1111-4111-8111-111111111111');
const BRANCH_ID: BranchId = asBranchId('22222222-2222-4222-8222-222222222222');
const OTHER_BRANCH_ID: BranchId = asBranchId('33333333-3333-4333-8333-333333333333');
const EMPLOYEE_ID = asEmployeeId('44444444-4444-4444-8444-444444444444');

describe('createEmployee', () => {
  it('creates an active employee with a trimmed name and audit timestamps', () => {
    const employee = createEmployee(
      {
        id: EMPLOYEE_ID,
        organizationId: ORGANIZATION_ID,
        branchId: BRANCH_ID,
        fullName: '  Maria Lopez  ',
      },
      NOW,
    );

    expect(employee).toEqual({
      id: EMPLOYEE_ID,
      organizationId: ORGANIZATION_ID,
      branchId: BRANCH_ID,
      fullName: 'Maria Lopez',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('preserves an explicit inactive state', () => {
    const employee = createEmployee(
      {
        id: EMPLOYEE_ID,
        organizationId: ORGANIZATION_ID,
        branchId: BRANCH_ID,
        fullName: 'Former Employee',
        isActive: false,
      },
      NOW,
    );

    expect(employee.isActive).toBe(false);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(() =>
      createEmployee(
        {
          id: EMPLOYEE_ID,
          organizationId: ORGANIZATION_ID,
          branchId: BRANCH_ID,
          fullName: '   ',
        },
        NOW,
      ),
    ).toThrowError('Employee name must be between 1 and 160 characters');
  });

  it('rejects a name longer than the allowed maximum', () => {
    expect(() =>
      createEmployee(
        {
          id: EMPLOYEE_ID,
          organizationId: ORGANIZATION_ID,
          branchId: BRANCH_ID,
          fullName: 'a'.repeat(EMPLOYEE_NAME_MAX_LENGTH + 1),
        },
        NOW,
      ),
    ).toThrowError('Employee name must be between 1 and 160 characters');
  });
});

describe('updateEmployee', () => {
  const employee = createEmployee(
    {
      id: EMPLOYEE_ID,
      organizationId: ORGANIZATION_ID,
      branchId: BRANCH_ID,
      fullName: 'Maria Lopez',
    },
    NOW,
  );

  it('trims the name, reassigns the branch, changes active state and advances updatedAt', () => {
    const updated = updateEmployee(
      employee,
      {
        branchId: OTHER_BRANCH_ID,
        fullName: '  Maria Lopez Rios  ',
        isActive: false,
      },
      '2026-11-09T13:00:00.000Z',
    );

    expect(updated).toEqual({
      ...employee,
      branchId: OTHER_BRANCH_ID,
      fullName: 'Maria Lopez Rios',
      isActive: false,
      updatedAt: '2026-11-09T13:00:00.000Z',
    });
    expect(updated.createdAt).toBe(employee.createdAt);
    expect(updated.organizationId).toBe(employee.organizationId);
    expect(updated.id).toBe(employee.id);
  });

  it('rejects an empty update name', () => {
    expect(() =>
      updateEmployee(
        employee,
        { branchId: BRANCH_ID, fullName: '   ', isActive: true },
        '2026-11-09T13:00:00.000Z',
      ),
    ).toThrowError('Employee name must be between 1 and 160 characters');
  });

  it('rejects an update name longer than the allowed maximum', () => {
    expect(() =>
      updateEmployee(
        employee,
        {
          branchId: BRANCH_ID,
          fullName: 'a'.repeat(EMPLOYEE_NAME_MAX_LENGTH + 1),
          isActive: true,
        },
        '2026-11-09T13:00:00.000Z',
      ),
    ).toThrowError('Employee name must be between 1 and 160 characters');
  });
});
