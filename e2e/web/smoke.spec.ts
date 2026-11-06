import { expect, test } from './fixtures/frozen-clock.js';

/**
 * Web shell smoke tests.
 *
 * These catch failures unit tests structurally cannot: a route tree that
 * compiles but does not mount in a browser, or a shell that stopped rendering
 * the shared application.
 */

test.describe('Smoke (web shell)', () => {
  test('application shell renders', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Inventory U3/);
  });

  test('the router mounts a route inside the shared frame', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('Inventory U3');
    await expect(page.getByText(/^Web · /)).toBeVisible();
  });

  test('navigates to the inventory placeholder', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByTestId('sidebar').getByRole('link', { name: 'Inventory' }).click();

    await expect(page).toHaveURL(/\/inventory$/);
    await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
    await expect(page.getByText('Inventory foundation')).toBeVisible();
  });

  test('the sidebar collapses to an icon rail and remembers the choice', async ({ page }) => {
    await page.goto('/');

    const sidebar = page.getByTestId('sidebar');
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' });

    await expect(sidebar).toHaveAttribute('data-collapsed', 'false');
    await expect(dashboardLink).toContainText('Dashboard');

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();

    await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
    await expect(dashboardLink).not.toContainText('Dashboard');
    expect(await page.evaluate(() => localStorage.getItem('inventory-u3-sidebar-collapsed'))).toBe(
      'true',
    );

    await page.reload();

    await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
    await page.getByRole('button', { name: 'Expand sidebar' }).click();
    await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toContainText('Dashboard');
  });

  test('the shell renders one frame', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(/^Inventory U3 · Milestone 2/)).toHaveCount(1);
    await expect(page.getByRole('button', { name: /sign out/i })).toHaveCount(1);
  });

  test('no console errors during startup', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('design tokens are present in the built stylesheet', async ({ page }) => {
    await page.goto('/');

    const brand = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-info').trim(),
    );

    expect(brand).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
