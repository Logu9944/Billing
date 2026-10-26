import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin, logout } from '../helpers/auth.js';

test.describe('Playwright Automation Foundation — Core Smoke Suite', () => {

  test('1. Application startup and availability', async ({ page }) => {
    // Navigate to the login entry point
    const response = await page.goto('/login');
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);

    // Verify document title and branding
    await expect(page).toHaveTitle(/Levroun ERP/i);
    await expect(page.locator('text=LEVROUN ERP')).toBeVisible();
    await expect(
      page.locator('text=Industry-Grade Multi-Currency Billing & Double-Entry Accounting System')
    ).toBeVisible();

    // Verify presence of accessible login form elements
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText('Sign In to Workspace');

    // Verify registration toggle is accessible
    const setupOrgBtn = page.locator('button:has-text("Set up Organization")');
    await expect(setupOrgBtn).toBeVisible();
  });

  test('2. Protected page access control', async ({ page, context }) => {
    // Ensure clean state without cookies
    await context.clearCookies();

    // Attempt direct access to protected dashboard
    await page.goto('/dashboard');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');

    // Attempt direct access to protected sales invoices
    await page.goto('/sales/invoices');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');

    // Attempt direct access to protected reports
    await page.goto('/reports');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('3. Authentication lifecycle (login & logout)', async ({ page }) => {
    // Perform login with verified credentials
    await loginAsAdmin(page);

    // Verify redirect to dashboard
    expect(page.url()).toContain('/dashboard');

    // Verify key header elements are populated
    await expect(page.locator('header span:has-text("Levroun")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('header span:has-text("Base: INR")')).toBeVisible();

    // Verify user profile is present
    const userProfile = page.locator('div[class*="userProfile"]');
    await expect(userProfile).toBeVisible();

    // Perform logout
    await logout(page);

    // Verify redirected back to login page
    expect(page.url()).toContain('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('4. Navigation to core modules', async ({ page }) => {
    // Start authenticated session
    await loginAsAdmin(page);

    const modules = [
      { name: 'Dashboard', path: '/dashboard', heading: 'Financial & Operational Dashboard' },
      { name: 'Invoices', path: '/sales/invoices', heading: 'Sales Invoices' },
      { name: 'Customers', path: '/sales/customers', heading: 'Customers' },
      { name: 'Payments Received', path: '/sales/payments', heading: 'Payments Received' },
      { name: 'Supplier Bills', path: '/purchases/bills', heading: 'Supplier Bills' },
      { name: 'Products & Services', path: '/inventory/products', heading: 'Products & Services' },
      { name: 'Ledgers', path: '/accounting/ledgers', heading: 'General Ledgers' },
      { name: 'Financial Reports', path: '/reports', heading: 'Financial Reports' },
      { name: 'Organization Settings', path: '/settings', heading: 'Organization Settings' },
      { name: 'Audit Trail', path: '/audit', heading: 'Audit Trail & Financial Governance' },
    ];

    for (const mod of modules) {
      // Click sidebar link
      const link = page.locator(`aside nav a[href="${mod.path}"]`);
      await expect(link).toBeVisible({ timeout: 5000 });
      await link.click();

      // Wait for URL and header
      await page.waitForURL(`**${mod.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const pageHeading = page.locator('main h1');
      await expect(pageHeading).toHaveText(mod.heading, { timeout: 10000 });

      // Verify sidebar nav item reflects active class
      await expect(link).toHaveClass(/navItemActive/);
    }
  });

  test('5. Detection of uncaught browser errors', async ({ monitoredPage }) => {
    const { page, getPageErrors } = monitoredPage;

    // Login and navigate through primary screens while monitoring for errors
    await loginAsAdmin(page);

    const checkRoutes = [
      '/dashboard',
      '/sales/invoices',
      '/sales/customers',
      '/accounting/chart-of-accounts',
      '/reports'
    ];

    for (const route of checkRoutes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      // Give asynchronous React client hydration time to complete
      await page.waitForTimeout(500);
    }

    // Verify no uncaught runtime exceptions occurred in the browser
    const fatalErrors = getPageErrors();
    expect(fatalErrors).toHaveLength(0);
  });

});
