import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { EmployeeManagement } from './employee-management.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

const BRANCH = {
  id: '22222222-2222-4222-8222-222222222222',
  organizationId: ORGANIZATION_ID,
  name: 'Central Market',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

const EMPLOYEE = {
  id: '44444444-4444-4444-8444-444444444444',
  organizationId: ORGANIZATION_ID,
  branchId: BRANCH.id,
  fullName: 'Maria Lopez',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

type FetchMock = Mock<typeof fetch>;

beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  window.localStorage.clear();
});

function storeSession(role: 'ADMINISTRATOR' | 'STAFF'): void {
  window.localStorage.setItem(
    'inventory-u3-session',
    JSON.stringify({
      token: 'token-123',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      user: {
        id: '11111111-3333-4444-8555-000000000001',
        organizationId: ORGANIZATION_ID,
        email: 'admin@inventory.test',
        fullName: 'Ada Administrator',
        role,
        isActive: true,
      },
    }),
  );
}

function renderEmployees(role: 'ADMINISTRATOR' | 'STAFF', fetchImplementation: typeof fetch) {
  storeSession(role);
  const client = new ApiClient({
    baseUrl: 'http://api.test/api/v1',
    fetchImplementation,
  });

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ApiClientProvider baseUrl="http://api.test/api/v1" client={client}>
        <SessionProvider>
          <EmployeeManagement />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function employeeApiMock(): FetchMock {
  const employees = [EMPLOYEE];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (init?.method === 'POST' && url.endsWith('/employees')) {
      const body = JSON.parse(String(init.body)) as {
        branchId: string;
        fullName: string;
        isActive?: boolean;
      };
      const created = {
        ...EMPLOYEE,
        id: '55555555-5555-4555-8555-555555555555',
        branchId: body.branchId,
        fullName: body.fullName,
        isActive: body.isActive ?? true,
      };
      employees.push(created);
      return new Response(JSON.stringify(created), { status: 201 });
    }

    if (init?.method === 'PUT') {
      const body = JSON.parse(String(init.body)) as {
        branchId: string;
        fullName: string;
        isActive: boolean;
      };
      const index = employees.findIndex((employee) => url.endsWith(`/employees/${employee.id}`));
      const existing = index >= 0 ? employees[index] : undefined;
      if (!existing) {
        return new Response('{}', { status: 404 });
      }

      const updated = {
        ...existing,
        ...body,
        updatedAt: '2026-11-09T13:00:00.000Z',
      };
      employees[index] = updated;
      return new Response(JSON.stringify(updated), { status: 200 });
    }

    if (url.endsWith('/employees')) {
      return new Response(JSON.stringify({ items: employees }), { status: 200 });
    }

    if (url.endsWith('/branches')) {
      return new Response(JSON.stringify({ items: [BRANCH] }), { status: 200 });
    }

    return new Response('{}', { status: 404 });
  });
}

async function chooseBranch(name: string): Promise<void> {
  fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Branch' }), {
    button: 0,
    ctrlKey: false,
    pointerType: 'mouse',
  });
  fireEvent.click(await screen.findByRole('option', { name }));
}

describe('EmployeeManagement', () => {
  it('lists employees with their branch and lets an administrator create one', async () => {
    const fetchImplementation = employeeApiMock();
    renderEmployees('ADMINISTRATOR', fetchImplementation);

    expect(await screen.findByText('Maria Lopez')).toBeInTheDocument();
    expect(screen.getByText('Central Market')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('employee-new'));
    fireEvent.change(screen.getByTestId('employee-full-name'), {
      target: { value: 'Ana Alvarez' },
    });
    await chooseBranch('Central Market');
    fireEvent.click(screen.getByTestId('employee-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        'http://api.test/api/v1/employees',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            branchId: BRANCH.id,
            fullName: 'Ana Alvarez',
            isActive: true,
          }),
        }),
      );
    });

    expect(await screen.findByText('Ana Alvarez')).toBeInTheDocument();
  });

  it('lets an administrator rename and deactivate an employee', async () => {
    const fetchImplementation = employeeApiMock();
    renderEmployees('ADMINISTRATOR', fetchImplementation);

    fireEvent.click(await screen.findByRole('button', { name: /edit maria lopez/i }));
    fireEvent.change(screen.getByTestId('employee-full-name'), {
      target: { value: 'Maria Lopez Rios' },
    });
    fireEvent.pointerDown(screen.getByTestId('employee-status'), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    });
    fireEvent.click(await screen.findByRole('option', { name: 'Inactive' }));
    fireEvent.click(screen.getByTestId('employee-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        `http://api.test/api/v1/employees/${EMPLOYEE.id}`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            branchId: BRANCH.id,
            fullName: 'Maria Lopez Rios',
            isActive: false,
          }),
        }),
      );
    });

    expect(await screen.findByText('Maria Lopez Rios')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows the list read-only to a non-administrator', async () => {
    renderEmployees('STAFF', employeeApiMock());

    expect(await screen.findByText('Maria Lopez')).toBeInTheDocument();
    expect(screen.queryByTestId('employee-new')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit maria lopez/i })).toBeNull();
  });
});
