/**
 * Authentication test helper for Playwright E2E tests.
 */
export async function loginAsAdmin(page, credentials = {}) {
  const email = credentials.email || process.env.TEST_USER_EMAIL || 'adhurva@levroun.com';
  const password = credentials.password || process.env.TEST_USER_PASSWORD || 'Password123!';

  await page.goto('/login');
  await page.locator('form[data-hydrated="true"]').waitFor({ state: 'attached', timeout: 15000 });

  // Fill login form
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  await page.waitForTimeout(300);

  // Click and await navigation
  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 45000 }),
    submitButton.click()
  ]);

  await page.locator('main h1:has-text("Financial & Operational Dashboard")').waitFor({ state: 'visible', timeout: 45000 });
}

export async function logout(page) {
  // Click user profile avatar / dropdown to trigger logout
  const userProfile = page.locator('div[class*="userProfile"]');
  await userProfile.waitFor({ state: 'visible', timeout: 5000 });
  await userProfile.click();

  // Wait for redirect back to login
  await page.waitForURL('**/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.locator('button[type="submit"]:has-text("Sign In to Workspace")').waitFor({ state: 'visible', timeout: 10000 });
}
