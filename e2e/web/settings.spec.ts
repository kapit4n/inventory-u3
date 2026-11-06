/**
 * Organization settings, in a real browser.
 *
 * Unit and integration tests cover the domain, validation and both database
 * engines. These specs answer the browser-only questions: does `/settings`
 * mount, does it prefill the organization, and does saving send the complete
 * settings payload?
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

test.describe('Settings', () => {
  test('prefills the organization identity', async ({ page }) => {
    const errors = watchForConsoleErrors(page);
    await installApi(page, {
      'GET /api/v1/organization': { body: ORGANIZATION },
    });

    await page.goto('/settings');

    await expect(
      page.getByRole('heading', { name: 'Organization settings', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('settings-name')).toHaveValue('Inventory U3');
    await expect(page.getByTestId('settings-time-zone')).toHaveValue('America/Lima');
    await expect(page.getByTestId('settings-currency')).toHaveValue('USD');

    expect(errors).toEqual([]);
  });

  test('saves the identity and shows the server echo', async ({ page }) => {
    const api = await installApi(page, {
      'GET /api/v1/organization': { body: ORGANIZATION },
      'PUT /api/v1/organization': {
        body: { ...ORGANIZATION, name: 'North Warehouse', currency: 'PEN' },
      },
    });

    await page.goto('/settings');
    await expect(page.getByTestId('settings-name')).toHaveValue('Inventory U3');

    await page.getByTestId('settings-name').fill('  North Warehouse  ');
    await page.getByTestId('settings-currency').fill('PEN');
    await page.getByTestId('settings-save').click();

    await expect(page.getByText('Organization settings saved.')).toBeVisible();

    await expect.poll(() => api.recorded.filter((row) => row.method === 'PUT')).toHaveLength(1);
    const written = api.recorded.find((row) => row.method === 'PUT')?.body;
    expect(written).toMatchObject({
      name: 'North Warehouse',
      timezone: 'America/Lima',
      currency: 'PEN',
    });

    await expect(page.getByTestId('settings-name')).toHaveValue('North Warehouse');
    await expect(page.getByTestId('settings-currency')).toHaveValue('PEN');
  });

  test('keeps the draft and names the permission refusal', async ({ page }) => {
    await installApi(page, {
      'GET /api/v1/organization': { body: ORGANIZATION },
      'PUT /api/v1/organization': {
        status: 403,
        body: {
          error: { code: 'FORBIDDEN', message: 'No', requestId: 'e2e' },
        },
      },
    });

    await page.goto('/settings');
    await page.getByTestId('settings-name').fill('New Name');
    await page.getByTestId('settings-save').click();

    await expect(page.getByTestId('settings-failure')).toHaveText(
      'Only an administrator can change organization settings.',
    );
    await expect(page.getByTestId('settings-name')).toHaveValue('New Name');
  });
});
