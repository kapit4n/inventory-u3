/**
 * Typed employee resource functions.
 *
 * They stay outside React so the application and tests share the same contract
 * and response validation.
 */

import {
  employeeListResponseSchema,
  employeeSchema,
  type CreateEmployeeBody,
  type EmployeeListResponse,
  type EmployeeResponse,
  type UpdateEmployeeBody,
} from '@inventory-u3/validation';

import type { ApiClient } from './http.js';

export async function listEmployees(client: ApiClient): Promise<readonly EmployeeResponse[]> {
  const response = await client.get<EmployeeListResponse>('/employees', {
    schema: employeeListResponseSchema,
  });
  return response.items;
}

export async function createEmployee(
  client: ApiClient,
  body: CreateEmployeeBody,
): Promise<EmployeeResponse> {
  return client.post<EmployeeResponse, CreateEmployeeBody>('/employees', body, {
    schema: employeeSchema,
  });
}

export async function updateEmployee(
  client: ApiClient,
  employeeId: string,
  body: UpdateEmployeeBody,
): Promise<EmployeeResponse> {
  return client.put<EmployeeResponse, UpdateEmployeeBody>(
    `/employees/${encodeURIComponent(employeeId)}`,
    body,
    { schema: employeeSchema },
  );
}
