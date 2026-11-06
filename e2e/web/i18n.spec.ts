/**
 * The translated surfaces, in a browser.
 *
 * The shared fixture pins English; this file overrides the locale before the
 * first navigation and covers the English switch back.
 */

import { expect, test } from './fixtures/frozen-clock.js';

import { watchForConsoleErrors } from './fixtures/console-errors.js';
import { installApi } from './fixtures/mock-api.js';

const ORGANIZATION = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Inventory U3',
  timezone: 'America/Lima',
  currency: 'USD',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('inventory-u3-locale', 'es');
  });
});

test.describe('Spanish', () => {
  test('translates the dashboard, inventory and the language switch', async ({ page }) => {
    const errors = watchForConsoleErrors(page);

    await page.goto('/dashboard');

    await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();
    await expect(
      page.getByTestId('sidebar').getByRole('link', { name: 'Inventario' }),
    ).toBeVisible();

    await page.getByTestId('sidebar').getByRole('link', { name: 'Inventario' }).click();
    await expect(page).toHaveURL(/\/inventory$/);
    await expect(page.getByRole('heading', { name: 'Inventario', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar a inglés' }).click();

    await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    expect(errors).toEqual([]);
  });

  test('translates the organization settings screen', async ({ page }) => {
    await installApi(page, {
      'GET /api/v1/organization': { body: ORGANIZATION },
    });

    await page.goto('/settings');

    await expect(
      page.getByRole('heading', { name: 'Configuración de la organización' }),
    ).toBeVisible();
    await expect(page.getByTestId('settings-name')).toHaveValue('Inventory U3');
    await expect(page.getByRole('button', { name: 'Guardar configuración' })).toBeVisible();
  });
});
