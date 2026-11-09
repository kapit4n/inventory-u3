/**
 * Employee persistence, on PostgreSQL.
 *
 * Every read takes the organization id explicitly. A branch id is data on the
 * employee, never a substitute for the organization boundary.
 */

import { and, asc, eq } from 'drizzle-orm';

import { employees } from '@inventory-u3/database/schema';
import type { Employee, EmployeeRepository } from '@inventory-u3/domain';
import {
  asBranchId,
  asEmployeeId,
  asOrganizationId,
  type EmployeeId,
  type IsoDateTime,
  type OrganizationId,
} from '@inventory-u3/types';

import type { InventoryDatabase } from '../postgres/connection.js';

type EmployeeRow = typeof employees.$inferSelect;

export class DrizzleEmployeeRepository implements EmployeeRepository {
  constructor(private readonly db: InventoryDatabase) {}

  async findById(
    organizationId: OrganizationId,
    employeeId: EmployeeId,
  ): Promise<Employee | undefined> {
    const [row] = await this.db
      .select()
      .from(employees)
      .where(and(eq(employees.organizationId, organizationId), eq(employees.id, employeeId)))
      .limit(1);

    return row ? toEmployee(row) : undefined;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<readonly Employee[]> {
    const rows = await this.db
      .select()
      .from(employees)
      .where(eq(employees.organizationId, organizationId))
      .orderBy(asc(employees.fullName), asc(employees.id));

    return rows.map(toEmployee);
  }

  async create(employee: Employee): Promise<Employee> {
    const [row] = await this.db
      .insert(employees)
      .values({
        id: employee.id,
        organizationId: employee.organizationId,
        branchId: employee.branchId,
        fullName: employee.fullName,
        isActive: employee.isActive,
        createdAt: new Date(employee.createdAt),
        updatedAt: new Date(employee.updatedAt),
      })
      .returning();

    if (!row) {
      throw new Error('Employee insert did not return a row');
    }

    return toEmployee(row);
  }

  async update(employee: Employee): Promise<Employee | undefined> {
    const [row] = await this.db
      .update(employees)
      .set({
        branchId: employee.branchId,
        fullName: employee.fullName,
        isActive: employee.isActive,
        updatedAt: new Date(employee.updatedAt),
      })
      .where(
        and(eq(employees.organizationId, employee.organizationId), eq(employees.id, employee.id)),
      )
      .returning();

    return row ? toEmployee(row) : undefined;
  }
}

function toEmployee(row: EmployeeRow): Employee {
  return {
    id: asEmployeeId(row.id),
    organizationId: asOrganizationId(row.organizationId),
    branchId: asBranchId(row.branchId),
    fullName: row.fullName,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString() as IsoDateTime,
    updatedAt: row.updatedAt.toISOString() as IsoDateTime,
  };
}
