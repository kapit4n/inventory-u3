import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError } from './http.js';
import { createBranch, listBranches, updateBranch } from './branches.js';

const BRANCH = {
  id: '22222222-2222-4222-8222-222222222222',
  organizationId: '11111111-1111-4111-8111-111111111111',
  name: 'Central Market',
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

describe('branch API client', () => {
  it('lists branches from the collection envelope', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [BRANCH] }));
    const client = clientWith(fetchImpl);

    await expect(listBranches(client)).resolves.toEqual([BRANCH]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/v1/branches');
  });

  it('creates a branch and validates the returned record', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse(BRANCH, 201));
    const client = clientWith(fetchImpl);

    await expect(
      createBranch(client, { name: 'Central Market', isActive: true }),
    ).resolves.toMatchObject({ name: 'Central Market', isActive: true });

    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"name":"Central Market","isActive":true}');
  });

  it('updates a branch under its encoded id', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ ...BRANCH, name: 'North Market' }));
    const client = clientWith(fetchImpl);

    await expect(
      updateBranch(client, BRANCH.id, { name: 'North Market', isActive: false }),
    ).resolves.toMatchObject({ name: 'North Market' });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      `http://api.test/api/v1/branches/${encodeURIComponent(BRANCH.id)}`,
    );
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('PUT');
  });

  it('rejects a drifted branch response', async () => {
    const fetchImpl = fetchMock(async () => jsonResponse({ items: [{ id: 'not-a-uuid' }] }));
    const client = clientWith(fetchImpl);

    await expect(listBranches(client)).rejects.toBeInstanceOf(ApiClientError);
  });
});
