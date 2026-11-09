/**
 * An employee is the person whose work is recorded, not an application user.
 *
 * Employees belong to one branch so a later production batch can name the person
 * who prepared the product. They do not log in; the central operator records the
 * work. Payroll, attendance, contact details and identity documents are outside
 * the master-data slice.
 */

import type { BranchId, EmployeeId, IsoDateTime, OrganizationId } from '@inventory-u3/types';

import { DomainError } from '../shared/errors.js';

export interface Employee {
  readonly id: EmployeeId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly fullName: string;
  readonly isActive: boolean;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
}

export interface NewEmployee {
  readonly id: EmployeeId;
  readonly organizationId: OrganizationId;
  readonly branchId: BranchId;
  readonly fullName: string;
  readonly isActive?: boolean;
}

export interface EmployeeUpdate {
  readonly branchId: BranchId;
  readonly fullName: string;
  readonly isActive: boolean;
}

export const EMPLOYEE_NAME_MAX_LENGTH = 160;

export function createEmployee(input: NewEmployee, now: IsoDateTime): Employee {
  return {
    id: input.id,
    organizationId: input.organizationId,
    branchId: input.branchId,
    fullName: validateEmployeeName(input.fullName),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Edit the mutable part of an employee.
 *
 * A branch change is a reassignment, not a transfer history. Employees are
 * deactivated rather than deleted so later production records keep a reference.
 */
export function updateEmployee(
  employee: Employee,
  update: EmployeeUpdate,
  at: IsoDateTime,
): Employee {
  return {
    ...employee,
    branchId: update.branchId,
    fullName: validateEmployeeName(update.fullName),
    isActive: update.isActive,
    updatedAt: at,
  };
}

function validateEmployeeName(candidate: string): string {
  const fullName = candidate.trim();

  if (fullName.length === 0 || fullName.length > EMPLOYEE_NAME_MAX_LENGTH) {
    throw new DomainError(
      'INVALID_INPUT',
      `Employee name must be between 1 and ${EMPLOYEE_NAME_MAX_LENGTH} characters`,
    );
  }

  return fullName;
}
