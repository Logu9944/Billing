import { test as base, expect } from '@playwright/test';
import { loginAsAdmin } from '../helpers/auth.js';

export const test = base.extend({
  // Override page to use domcontentloaded for fast, reliable navigation in Next.js
  page: async ({ page }, use) => {
    await use(page);
  },

  // Fixture that monitors uncaught browser exceptions and console errors
  monitoredPage: async ({ page }, use) => {
    const pageErrors = [];
    const consoleErrors = [];

    page.on('pageerror', (exception) => {
      pageErrors.push(exception);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await use({
      page,
      getPageErrors: () => pageErrors,
      getConsoleErrors: () => consoleErrors,
    });
  },

  // Fixture that starts already logged in as Admin
  authenticatedPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});

export { expect };
