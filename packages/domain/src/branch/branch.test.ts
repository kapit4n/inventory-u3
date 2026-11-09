import { describe, expect, it } from 'vitest';

import { asBranchId, asOrganizationId } from '@inventory-u3/types';

import { BRANCH_NAME_MAX_LENGTH, createBranch } from './branch.js';

const NOW = '2026-11-09T12:00:00.000Z';
const ORGANIZATION_ID = asOrganizationId('11111111-1111-4111-8111-111111111111');
const BRANCH_ID = asBranchId('22222222-2222-4222-8222-222222222222');

describe('createBranch', () => {
  it('creates an active branch with trimmed name and audit timestamps', () => {
    const branch = createBranch(
      {
        id: BRANCH_ID,
        organizationId: ORGANIZATION_ID,
        name: '  Central Market  ',
      },
      NOW,
    );

    expect(branch).toEqual({
      id: BRANCH_ID,
      organizationId: ORGANIZATION_ID,
      name: 'Central Market',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('preserves an explicit inactive state', () => {
    const branch = createBranch(
      {
        id: BRANCH_ID,
        organizationId: ORGANIZATION_ID,
        name: 'Closed Branch',
        isActive: false,
      },
      NOW,
    );

    expect(branch.isActive).toBe(false);
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(() =>
      createBranch({ id: BRANCH_ID, organizationId: ORGANIZATION_ID, name: '   ' }, NOW),
    ).toThrowError('Branch name must be between 1 and 120 characters');
  });

  it('rejects a name longer than the allowed maximum', () => {
    expect(() =>
      createBranch(
        {
          id: BRANCH_ID,
          organizationId: ORGANIZATION_ID,
          name: 'a'.repeat(BRANCH_NAME_MAX_LENGTH + 1),
        },
        NOW,
      ),
    ).toThrowError('Branch name must be between 1 and 120 characters');
  });
});
