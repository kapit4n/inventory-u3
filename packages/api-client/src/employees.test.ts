import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError } from './http.js';
import { createEmployee, listEmployees, updateEmployee } from './employees.js';

const EMPLOYEE = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: '11111111-1111-4111-8111-111111111111',
  branchId: '22222222-2222-4222-8222-222222222222',
  fullName: 'Maria Lopez',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

function fetchMock(handler: (url: string, init?: RequestInit) => Promise<Response>): FetchMock {
  return vi.fn(handler as unknown as typeof fetch);
}

function clientWith(fetchImplementation: typeof fetch): ApiClient {
  return new ApiClient({ baseUrl: 'http://api.test/api/v1', fetchImplementation });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('employee API client', () => {
  it('lists employees from the collection envelope', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [EMPLOYEE] }));
    const client = clientWith(fetchImpl);

    await expect(listEmployees(client)).resolves.toEqual([EMPLOYEE]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/v1/employees');
  });

  it('creates an employee and validates the returned record', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse(EMPLOYEE, 201));
    const client = clientWith(fetchImpl);

    await expect(
      createEmployee(client, {
        branchId: EMPLOYEE.branchId,
        fullName: '  Maria Lopez  ',
      }),
    ).resolves.toMatchObject({ branchId: EMPLOYEE.branchId, fullName: 'Maria Lopez' });

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(`{"branchId":"${EMPLOYEE.branchId}","fullName":"  Maria Lopez  "}`);
  });

  it('updates an employee under its encoded id', async () => {
    const fetchImpl = fetchMock(async () =>
      jsonResponse({ ...EMPLOYEE, fullName: 'Maria Lopez Rios', isActive: false }),
    );
    const client = clientWith(fetchImpl);

    await expect(
      updateEmployee(client, EMPLOYEE.id, {
        branchId: EMPLOYEE.branchId,
        fullName: 'Maria Lopez Rios',
        isActive: false,
      }),
    ).resolves.toMatchObject({ fullName: 'Maria Lopez Rios', isActive: false });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `http://api.test/api/v1/employees/${encodeURIComponent(EMPLOYEE.id)}`,
    );
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('PUT');
  });

  it('rejects a drifted employee response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listEmployees(client)).rejects.toBeInstanceOf(ApiClientError);
  });
});
