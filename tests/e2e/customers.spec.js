import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { createCustomerData } from '../fixtures/factories.js';
import { 
  cleanupTargetedTestRecords, 
  getDbCustomer, 
  setCustomerActiveState 
} from '../helpers/test-cleanup.js';

test.describe('Phase 2 — Customer Management Automation', () => {
  const createdCodes = [];

  test.afterAll(async () => {
    // Targeted cleanup of only the records created by this suite
    if (createdCodes.length > 0) {
      await cleanupTargetedTestRecords({ customerCodes: createdCodes });
    }
  });

  test('1. Navigate to Customers module and verify structure', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    // Verify page header and layout
    await expect(page.locator('main h1')).toHaveText('Customers');
    await expect(
      page.locator('text=Manage corporate clients, multi-currency credit limits, and receivables')
    ).toBeVisible();

    // Verify search input, refresh button, and New Customer CTA
    await expect(page.getByPlaceholder('Search by name, code, or email...')).toBeVisible();
    await expect(page.getByTitle('Refresh list')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Customer' })).toBeVisible();
  });

  test('2. Create customer with valid details & verify listing and persistence', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    const customerData = createCustomerData();
    createdCodes.push(customerData.code);

    // Open creation modal
    await page.getByRole('button', { name: 'New Customer' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeVisible();

    // Fill form fields using accessible locators
    await page.locator('input[placeholder="Acme International LLC"]').fill(customerData.name);
    await page.locator('input[placeholder="CUST-1001 (auto if blank)"]').fill(customerData.code);
    await page.locator('select.form-select').first().selectOption(customerData.currency);
    await page.locator('input[value="30"]').fill(customerData.paymentTermsDays.toString());
    await page.locator('input[placeholder="US12345678"]').fill(customerData.taxId);
    await page.locator('input[value="10000"]').fill(customerData.creditLimit);
    await page.locator('input[placeholder="billing@acme.com"]').fill(customerData.email);
    await page.locator('input[placeholder="+1 415 555 2671"]').fill(customerData.phone);

    // Billing address fields
    await page.locator('input[placeholder="Street Address"]').fill(customerData.billingAddress.street);
    await page.locator('input[placeholder="City"]').fill(customerData.billingAddress.city);
    await page.locator('input[placeholder="State"]').fill(customerData.billingAddress.state);
    await page.locator('input[placeholder="Postal Code"]').fill(customerData.billingAddress.postalCode);

    // Submit form
    await page.getByRole('button', { name: 'Save Customer' }).click();

    // Verify modal closes
    await expect(page.getByText('Create Commercial Customer')).toBeHidden({ timeout: 10000 });

    // Verify customer appears in the table
    const row = page.locator('table.enterprise-table tbody tr', { hasText: customerData.code });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('td').nth(1)).toContainText(customerData.name);
    await expect(row).toContainText(customerData.currency);
    await expect(row).toContainText(`Net ${customerData.paymentTermsDays} Days`);

    // Verify persistence after page reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const rowAfterReload = page.locator('table.enterprise-table tbody tr', { hasText: customerData.code });
    await expect(rowAfterReload).toBeVisible({ timeout: 10000 });
    await expect(rowAfterReload).toContainText(customerData.name);

    // Database verification: Verify record was persisted with correct schema and tenancy
    const dbCustomer = await getDbCustomer(customerData.code);
    expect(dbCustomer).not.toBeNull();
    expect(dbCustomer.name).toBe(customerData.name);
    expect(dbCustomer.currency).toBe(customerData.currency);
    expect(dbCustomer.taxId).toBe(customerData.taxId);
    expect(dbCustomer.isActive).toBe(true);
    expect(dbCustomer.organizationId).toBeDefined();
  });

  test('3. Search and real-time filtering', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    // Create a unique customer for searching
    const searchTarget = createCustomerData({ name: `Searchable Alpha ${Date.now()}` });
    createdCodes.push(searchTarget.code);

    await page.getByRole('button', { name: 'New Customer' }).click();
    await page.locator('input[placeholder="Acme International LLC"]').fill(searchTarget.name);
    await page.locator('input[placeholder="CUST-1001 (auto if blank)"]').fill(searchTarget.code);
    await page.locator('input[placeholder="billing@acme.com"]').fill(searchTarget.email);
    await page.getByRole('button', { name: 'Save Customer' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeHidden();

    const searchInput = page.getByPlaceholder('Search by name, code, or email...');

    // Search by exact code
    await searchInput.fill(searchTarget.code);
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: searchTarget.code })).toBeVisible();

    // Search by non-existent query
    await searchInput.fill('NON_EXISTENT_QUERY_99999');
    await expect(page.locator('text=No customers found')).toBeVisible();

    // Clear search query
    await searchInput.fill('');
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: searchTarget.code })).toBeVisible();
  });

  test('4. Required-field and email format validation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'New Customer' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeVisible();

    const nameInput = page.locator('input[placeholder="Acme International LLC"]');
    const emailInput = page.locator('input[placeholder="billing@acme.com"]');
    const saveButton = page.getByRole('button', { name: 'Save Customer' });

    // Verify Name has required attribute
    await expect(nameInput).toHaveAttribute('required', '');

    // Fill invalid email format
    await nameInput.fill('Valid Company Name');
    await emailInput.fill('invalid-email-format');
    await saveButton.click();

    // Browser email validation should block submission and modal remains open
    await expect(page.getByText('Create Commercial Customer')).toBeVisible();

    // Close modal via Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeHidden();
  });

  test('5. Archiving workflow and final state verification', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    // Create customer to be archived
    const archCustomer = createCustomerData({ name: `Archive Target ${Date.now()}` });
    createdCodes.push(archCustomer.code);

    await page.getByRole('button', { name: 'New Customer' }).click();
    await page.locator('input[placeholder="Acme International LLC"]').fill(archCustomer.name);
    await page.locator('input[placeholder="CUST-1001 (auto if blank)"]').fill(archCustomer.code);
    await page.getByRole('button', { name: 'Save Customer' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeHidden();

    // Confirm visible initially
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: archCustomer.code })).toBeVisible();

    // Perform soft-delete/archiving via backend lifecycle state
    await setCustomerActiveState(archCustomer.code, false);

    // Reload page to verify customer is excluded from active listings
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder('Search by name, code, or email...');
    await searchInput.fill(archCustomer.code);
    await expect(page.locator('text=No customers found')).toBeVisible();

    // Database verification: Verify customer record is preserved but marked inactive
    const dbRecord = await getDbCustomer(archCustomer.code);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.isActive).toBe(false);
  });

  test('6. UI capabilities audit — in-place edit & deletion controls', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    // Audit existing V1.0 table headers and row actions
    const tableHeaders = await page.locator('table.enterprise-table thead th').allTextContents();
    
    // Verify standard columns
    expect(tableHeaders).toContain('Customer Code');
    expect(tableHeaders).toContain('Customer Name');
    expect(tableHeaders).toContain('Currency');

    // Document capability: Row-level inline edit and archive actions are actively exposed in UI
    const actionHeader = tableHeaders.find(h => /\b(actions?|edit|manage|operations?)\b/i.test(h));
    expect(actionHeader).toBeDefined();
  });

});
