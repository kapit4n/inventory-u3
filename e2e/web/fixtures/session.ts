import type { Page } from '@playwright/test';

/**
 * Overrides the role of the session the shared fixture installs.
 *
 * The fixture always starts as an administrator because most specs exercise the
 * management flows. A read-only spec calls this before the first navigation to
 * prove the same screen hides its write actions for a non-administrator.
 */
export async function setSessionRole(
  page: Page,
  role: 'ADMINISTRATOR' | 'MANAGER' | 'STAFF',
): Promise<void> {
  await page.addInitScript((nextRole) => {
    window.localStorage.setItem(
      'inventory-u3-session',
      JSON.stringify({
        token: 'e2e-session-token',
        expiresAt: '2030-01-01T00:00:00.000Z',
        user: {
          id: '00000000-0000-4000-8000-000000000002',
          organizationId: '11111111-1111-4111-8111-111111111111',
          email: `${nextRole.toLowerCase()}@inventory.test`,
          fullName: 'E2E Reader',
          role: nextRole,
          isActive: true,
        },
      }),
    );
  }, role);
}
