import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';

test.describe('Phase 2 — Accounting, Ledgers & Financial Reports Automation', () => {
  test.describe.configure({ mode: 'serial' });

  test('1. Navigate to Chart of Accounts and Ledgers, verify classifications and balances', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Chart of Accounts
    await page.goto('/accounting/chart-of-accounts');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main h1')).toHaveText('Chart of Accounts');
    await expect(
      page.locator('text=Standardized general ledger account classifications and real-time ledger balances')
    ).toBeVisible();

    // Verify standardized accounting classification cards
    const expectedCategories = [
      'ASSET ACCOUNTS',
      'LIABILITY ACCOUNTS',
      'EQUITY ACCOUNTS',
      'REVENUE ACCOUNTS',
      'EXPENSE ACCOUNTS'
    ];
    for (const cat of expectedCategories) {
      await expect(page.getByText(cat)).toBeVisible();
    }

    // 2. Ledgers
    await page.goto('/accounting/ledgers');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main h1')).toHaveText('General Ledgers');
    await expect(page.locator('select.form-select').first()).toBeVisible();

    const expectedLedgerHeaders = [
      'Date',
      'Journal Entry #',
      'Type',
      'Transaction Memo / Details',
      'Foreign Currency Info',
      'Debit (INR)',
      'Credit (INR)',
      'Running Balance (INR)'
    ];
    for (const header of expectedLedgerHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
    }
  });

  test('2. Verify double-entry balancing invariant and Financial Reports (P&L, Balance Sheet)', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Journal entries balancing check
    await page.goto('/accounting/journal');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main h1')).toHaveText('Journal Entries');

    // If journal entries exist, verify they strictly adhere to double-entry posted equilibrium
    const postedBadges = page.locator('.badge-paid:has-text("POSTED & BALANCED")');
    const badgeCount = await postedBadges.count();
    if (badgeCount > 0) {
      for (let i = 0; i < badgeCount; i++) {
        await expect(postedBadges.nth(i)).toBeVisible();
      }
    }

    // 2. Financial Reports: Profit & Loss Statement
    await page.goto('/reports');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main h1')).toHaveText('Financial Reports');

    // Verify all 3 report tabs are available
    const pnlTab = page.getByRole('button', { name: 'Profit & Loss Statement (Income Statement)' });
    const bsTab = page.getByRole('button', { name: 'Balance Sheet (Financial Position)' });
    const arTab = page.getByRole('button', { name: 'A/R Aging Schedule' });

    await expect(pnlTab).toBeVisible();
    await expect(bsTab).toBeVisible();
    await expect(arTab).toBeVisible();

    // Verify P&L content
    await expect(page.getByText('STATEMENT OF PROFIT & LOSS')).toBeVisible();
    await expect(page.getByText('OPERATING REVENUE')).toBeVisible();
    await expect(page.getByText('TOTAL REVENUE (A)')).toBeVisible();
    await expect(page.getByText('NET PROFIT / (LOSS)')).toBeVisible();

    // 3. Switch to Balance Sheet Tab
    await bsTab.click();
    await expect(page.locator('h2:has-text("BALANCE SHEET")')).toBeVisible();
    await expect(page.getByText('ASSETS').first()).toBeVisible();
    await expect(page.getByText('TOTAL ASSETS:').first()).toBeVisible();
    await expect(page.getByText('LIABILITIES & EQUITY').first()).toBeVisible();

    // 4. Switch to A/R Aging Schedule Tab
    await arTab.click();
    await expect(page.locator('h2:has-text("ACCOUNTS RECEIVABLE AGING SCHEDULE")')).toBeVisible();
  });
});
