import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiClient } from '@inventory-u3/api-client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import { ApiClientProvider } from '../../../query/api-client-provider.js';
import { SessionProvider } from '../../auth/session-provider.js';
import { BranchManagement } from './branch-management.js';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

const BRANCH = {
  id: '22222222-2222-4222-8222-222222222222',
  organizationId: ORGANIZATION_ID,
  name: 'Central Market',
  isActive: true,
  createdAt: '2026-11-09T12:00:00.000Z',
  updatedAt: '2026-11-09T12:00:00.000Z',
};

type FetchMock = Mock<typeof fetch>;

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

function renderBranches(role: 'ADMINISTRATOR' | 'STAFF', fetchImplementation: typeof fetch) {
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
          <BranchManagement />
        </SessionProvider>
      </ApiClientProvider>
    </QueryClientProvider>,
  );
}

function branchApiMock(): FetchMock {
  const branches = [BRANCH];

  return vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);

    if (init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { name: string; isActive?: boolean };
      const created = {
        ...BRANCH,
        id: '33333333-3333-4333-8333-333333333333',
        name: body.name,
        isActive: body.isActive ?? true,
      };
      branches.push(created);
      return new Response(JSON.stringify(created), { status: 201 });
    }

    if (url.endsWith('/branches')) {
      return new Response(JSON.stringify({ items: branches }), { status: 200 });
    }

    return new Response('{}', { status: 404 });
  });
}

describe('BranchManagement', () => {
  it('lists branches and lets an administrator create one', async () => {
    const fetchImplementation = branchApiMock();
    renderBranches('ADMINISTRATOR', fetchImplementation);

    expect(await screen.findByText('Central Market')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('branch-new'));
    fireEvent.change(screen.getByTestId('branch-name'), {
      target: { value: 'North Market' },
    });
    fireEvent.click(screen.getByTestId('branch-save'));

    await waitFor(() => {
      expect(fetchImplementation).toHaveBeenCalledWith(
        'http://api.test/api/v1/branches',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'North Market', isActive: true }),
        }),
      );
    });

    expect(await screen.findByText('North Market')).toBeInTheDocument();
  });

  it('shows the list read-only to a non-administrator', async () => {
    renderBranches('STAFF', branchApiMock());

    expect(await screen.findByText('Central Market')).toBeInTheDocument();
    expect(screen.queryByTestId('branch-new')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit central market/i })).toBeNull();
  });
});
