/**
 * Shared browser fixture.
 *
 * Every spec starts signed in and pinned to English. The login spec clears the
 * session it inherits; the i18n spec overrides the locale to Spanish. Keeping
 * both choices here means each spec asks only the question it is about.
 */

import { expect, test as base } from '@playwright/test';

export { expect };

/** A fixed instant makes the suite independent of the machine's calendar. */
export const FROZEN_NOW = '2026-10-05T13:00:00.000Z';

export const TEST_SESSION = {
  token: 'e2e-session-token',
  expiresAt: '2030-01-01T00:00:00.000Z',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    organizationId: '11111111-1111-4111-8111-111111111111',
    email: 'admin@inventory.test',
    fullName: 'E2E Admin',
    role: 'ADMINISTRATOR',
    isActive: true,
  },
} as const;

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.setFixedTime(FROZEN_NOW);
    await page.addInitScript((session) => {
      window.localStorage.setItem('inventory-u3-session', JSON.stringify(session));
    }, TEST_SESSION);
    await page.addInitScript(() => {
      window.localStorage.setItem('inventory-u3-locale', 'en');
    });
    await use(page);
  },
});
