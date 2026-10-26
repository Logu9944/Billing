import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { createSupplierData } from '../fixtures/factories.js';
import { 
  cleanupTargetedTestRecords, 
  getDbSupplier, 
  setSupplierActiveState 
} from '../helpers/test-cleanup.js';

test.describe('Phase 2 — Supplier Management Automation', () => {
  const createdCodes = [];

  test.afterAll(async () => {
    if (createdCodes.length > 0) {
      await cleanupTargetedTestRecords({ supplierCodes: createdCodes });
    }
  });

  test('1. Navigate to Suppliers module and verify interface', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/purchases/suppliers');
    await page.waitForLoadState('domcontentloaded');

    // Verify page header
    await expect(page.locator('main h1')).toHaveText('Suppliers & Vendors');
    await expect(
      page.locator('text=Manage corporate vendors, multi-currency payables, and terms')
    ).toBeVisible();

    // Verify search input, refresh button, and New Supplier CTA
    await expect(page.getByPlaceholder('Search supplier name, code...')).toBeVisible();
    await expect(page.getByTitle('Refresh list')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Supplier' })).toBeVisible();
  });

  test('2. Create supplier with valid details & verify listing and persistence', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/purchases/suppliers');
    await page.waitForLoadState('domcontentloaded');

    const supplierData = createSupplierData();
    createdCodes.push(supplierData.code);

    // Open creation modal
    await page.getByRole('button', { name: 'New Supplier' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeVisible();

    // Fill form fields with real placeholders from page.jsx
    await page.locator('input[placeholder="Dell India Pvt Ltd"]').fill(supplierData.name);
    await page.locator('input[placeholder="SUPP-1001 (auto if blank)"]').fill(supplierData.code);
    await page.locator('select.form-select').selectOption(supplierData.currency);
    await page.locator('input[placeholder="29AABCB1234F1Z1"]').fill(supplierData.taxId);
    await page.locator('input[placeholder="sales@dell.com"]').fill(supplierData.email);
    await page.locator('input[placeholder="+91 80 4455 6677"]').fill(supplierData.phone);

    // Submit form
    await page.getByRole('button', { name: 'Save Supplier' }).click();

    // Modal closes
    await expect(page.getByText('Create Vendor / Supplier')).toBeHidden({ timeout: 10000 });

    // Verify supplier row appears in table
    const row = page.locator('table.enterprise-table tbody tr', { hasText: supplierData.code });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(supplierData.name);
    await expect(row).toContainText(supplierData.currency);

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const rowAfterReload = page.locator('table.enterprise-table tbody tr', { hasText: supplierData.code });
    await expect(rowAfterReload).toBeVisible({ timeout: 10000 });
    await expect(rowAfterReload).toContainText(supplierData.name);

    // Database verification: Verify record in test database
    const dbSupplier = await getDbSupplier(supplierData.code);
    expect(dbSupplier).not.toBeNull();
    expect(dbSupplier.name).toBe(supplierData.name);
    expect(dbSupplier.currency).toBe(supplierData.currency);
    expect(dbSupplier.taxId).toBe(supplierData.taxId);
    expect(dbSupplier.isActive).toBe(true);
  });

  test('3. Search and filtering for suppliers', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/purchases/suppliers');
    await page.waitForLoadState('domcontentloaded');

    const searchTarget = createSupplierData({ name: `Searchable Vendor ${Date.now()}` });
    createdCodes.push(searchTarget.code);

    await page.getByRole('button', { name: 'New Supplier' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeVisible();

    await page.locator('input[placeholder="Dell India Pvt Ltd"]').fill(searchTarget.name);
    await page.locator('input[placeholder="SUPP-1001 (auto if blank)"]').fill(searchTarget.code);
    await page.getByRole('button', { name: 'Save Supplier' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeHidden();

    const searchInput = page.getByPlaceholder('Search supplier name, code...');

    // Search by code
    await searchInput.fill(searchTarget.code);
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: searchTarget.code })).toBeVisible();

    // Non-existent search
    await searchInput.fill('NON_EXISTENT_SUPP_888');
    await expect(page.locator('text=No suppliers registered yet')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: searchTarget.code })).toBeVisible();
  });

  test('4. Form validation for suppliers', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/purchases/suppliers');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'New Supplier' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeVisible();

    const nameInput = page.locator('input[placeholder="Dell India Pvt Ltd"]');
    const emailInput = page.locator('input[placeholder="sales@dell.com"]');
    const saveButton = page.getByRole('button', { name: 'Save Supplier' });

    // Required check
    await expect(nameInput).toHaveAttribute('required', '');

    // Invalid email format test
    await nameInput.fill('Valid Supplier Name');
    await emailInput.fill('not-a-valid-email');
    await saveButton.click();

    // Modal stays open due to HTML5 validation
    await expect(page.getByText('Create Vendor / Supplier')).toBeVisible();

    // Cancel modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeHidden();
  });

  test('5. Archiving / soft-delete workflow for suppliers', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/purchases/suppliers');
    await page.waitForLoadState('domcontentloaded');

    const archSupplier = createSupplierData({ name: `Archive Supplier ${Date.now()}` });
    createdCodes.push(archSupplier.code);

    await page.getByRole('button', { name: 'New Supplier' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeVisible();

    await page.locator('input[placeholder="Dell India Pvt Ltd"]').fill(archSupplier.name);
    await page.locator('input[placeholder="SUPP-1001 (auto if blank)"]').fill(archSupplier.code);
    await page.getByRole('button', { name: 'Save Supplier' }).click();
    await expect(page.getByText('Create Vendor / Supplier')).toBeHidden();

    // Verify visible initially
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: archSupplier.code })).toBeVisible();

    // Set inactive in backend
    await setSupplierActiveState(archSupplier.code, false);

    // Refresh and confirm removal from active list
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder('Search supplier name, code...');
    await searchInput.fill(archSupplier.code);
    await expect(page.locator('text=No suppliers registered yet')).toBeVisible();

    // Database verification: Verify state is inactive
    const dbRecord = await getDbSupplier(archSupplier.code);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.isActive).toBe(false);
  });

  test('6. UI capabilities audit — in-place edit & deletion controls', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/purchases/suppliers');
    await page.waitForLoadState('domcontentloaded');

    // Audit V1.0 table headers
    const headers = await page.locator('table.enterprise-table thead th').allTextContents();
    expect(headers).toContain('Supplier Code');
    expect(headers).toContain('Supplier Name');
    expect(headers).toContain('Currency');

    const actionHeader = headers.find(h => /\b(actions?|edit|manage|operations?)\b/i.test(h));
    expect(actionHeader).toBeDefined();
  });

});
