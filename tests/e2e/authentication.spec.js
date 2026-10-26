import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin, logout } from '../helpers/auth.js';

test.describe('Phase 2 — Authentication & Multi-Tenancy Security', () => {

  test('1. Invalid credentials displays descriptive error message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"]').fill('adhurva@levroun.com');
    await page.locator('input[type="password"]').fill('WrongPassword999!');
    await page.locator('button[type="submit"]').click();

    // Verify error banner is visible
    const errorBanner = page.locator('text=Invalid credentials');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('2. Required fields validation on login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('3. Session cookie is set and accessible after login', async ({ page, context }) => {
    await loginAsAdmin(page);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'fin_session');

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie.httpOnly).toBe(true);
    expect(sessionCookie.value.length).toBeGreaterThan(20);
  });

  test('4. Session termination on logout clears access', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);

    expect(page.url()).toContain('/login');

    // Attempting to visit dashboard again redirects to login
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

});
