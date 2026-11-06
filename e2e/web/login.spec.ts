/**
 * Signing in and out, in a real browser.
 *
 * The shared fixture seeds a session, so these tests remove it first: the point
 * here is the edge the rest of the suite skips over — the app must show a login
 * screen when there is no session, and reach the shell only after the API agrees.
 */

import { expect, test } from './fixtures/frozen-clock.js';
import { installApi } from './fixtures/mock-api.js';

const LOGIN_BODY = {
  token: 'fresh-e2e-token',
  expiresAt: '2030-01-01T00:00:00.000Z',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    organizationId: '11111111-1111-4111-8111-111111111111',
    email: 'admin@inventory.test',
    fullName: 'E2E Admin',
    role: 'ADMINISTRATOR',
    isActive: true,
  },
};

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await installApi(page, {
      'GET /api/v1/auth/dev-users': { body: { items: [] } },
    });
  });

  async function startLoggedOut(page: import('@playwright/test').Page): Promise<void> {
    await page.addInitScript(() => window.localStorage.removeItem('inventory-u3-session'));
  }

  test('shows the login screen when there is no session', async ({ page }) => {
    await startLoggedOut(page);
    await page.goto('/');

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0);
  });

  test('reaches the shell after a successful login', async ({ page }) => {
    await startLoggedOut(page);
    await installApi(page, {
      'POST /api/v1/auth/login': { body: LOGIN_BODY },
      '/api/v1/auth/logout': { status: 204, body: null },
    });

    await page.goto('/');
    await page.getByLabel('Email').fill('admin@inventory.test');
    await page.getByLabel('Password').fill('inventory-dev');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows one message when the API refuses the credentials', async ({ page }) => {
    await startLoggedOut(page);
    await installApi(page, {
      'POST /api/v1/auth/login': {
        status: 401,
        body: {
          error: { code: 'UNAUTHENTICATED', message: 'The email or password is incorrect' },
        },
      },
    });

    await page.goto('/');
    await page.getByLabel('Email').fill('admin@inventory.test');
    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText('The email or password is incorrect.');
  });

  test('says it is throttled instead of blaming the password', async ({ page }) => {
    await startLoggedOut(page);
    await installApi(page, {
      'POST /api/v1/auth/login': {
        status: 429,
        body: {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many sign-in attempts. Try again later.',
            requestId: 'req-e2e-throttled',
          },
        },
      },
    });

    await page.goto('/');
    await page.getByLabel('Email').fill('admin@inventory.test');
    await page.getByLabel('Password').fill('inventory-dev');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText('Too many sign-in attempts. Try again later.');
  });

  test('offers the development users and signs in as one', async ({ page }) => {
    await startLoggedOut(page);
    await installApi(page, {
      'GET /api/v1/auth/dev-users': {
        body: { items: [{ ...LOGIN_BODY.user, fullName: 'E2E Admin' }] },
      },
      'POST /api/v1/auth/dev-login': { body: LOGIN_BODY },
    });

    await page.goto('/');
    await page.getByRole('button', { name: /sign in as e2e admin/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('signs out and returns to the login screen', async ({ page }) => {
    await installApi(page, {
      '/api/v1/auth/logout': { status: 204, body: null },
    });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();

    await expect(page.getByLabel('Email')).toBeVisible();
  });
});
