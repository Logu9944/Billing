import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { createCustomerData } from '../fixtures/factories.js';
import { 
  cleanupTargetedTestRecords, 
  getDbInvoice 
} from '../helpers/test-cleanup.js';

test.describe('Phase 2 — Invoicing Management & POS Automation', () => {
  test.describe.configure({ mode: 'serial' });

  const createdCustomerCodes = [];
  const createdProductSkus = [];
  const createdInvoiceNumbers = [];

  test.afterAll(async () => {
    await cleanupTargetedTestRecords({
      customerCodes: createdCustomerCodes,
      productSkus: createdProductSkus,
      invoiceNumbers: createdInvoiceNumbers
    });
  });

  test('1. Navigate to Invoices module and verify table structure', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/sales/invoices');
    await page.waitForLoadState('domcontentloaded');

    // Verify page header
    await expect(page.locator('main h1')).toHaveText('Sales Invoices');
    await expect(
      page.locator('text=Issue, track, and export commercial multi-currency invoices with automatic ledger integration')
    ).toBeVisible();

    // Verify search input, status filter, and Create Invoice CTA
    await expect(page.getByPlaceholder('Search invoice # or client...')).toBeVisible();
    await expect(page.locator('select.form-select').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create Invoice' })).toBeVisible();

    // Verify table headers using exact columnheader accessible roles
    const expectedHeaders = [
      'Invoice Number',
      'Customer',
      'Date',
      'Due Date',
      'Status',
      'Document Amount',
      'Base Amount (INR)',
      'Balance Due',
      'Actions'
    ];
    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
    }
  });

  test('2. Create and finalize multi-currency USD invoice with automated ledger posting', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Create a customer to ensure a clean selectable target
    const customerData = createCustomerData();
    createdCustomerCodes.push(customerData.code);

    await page.goto('/sales/customers');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'New Customer' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeVisible();

    await page.locator('input[placeholder="Acme International LLC"]').fill(customerData.name);
    await page.locator('input[placeholder="CUST-1001 (auto if blank)"]').fill(customerData.code);
    await page.locator('select.form-select').first().selectOption(customerData.currency);
    await page.locator('input[value="30"]').fill(customerData.paymentTermsDays.toString());
    await page.locator('input[placeholder="US12345678"]').fill(customerData.taxId);
    await page.locator('input[value="10000"]').fill(customerData.creditLimit);
    await page.locator('input[placeholder="billing@acme.com"]').fill(customerData.email);
    await page.locator('input[placeholder="+1 415 555 2671"]').fill(customerData.phone);

    await page.getByRole('button', { name: 'Save Customer' }).click();
    await expect(page.getByText('Create Commercial Customer')).toBeHidden({ timeout: 10000 });

    const custRow = page.locator('table.enterprise-table tbody tr', { hasText: customerData.code });
    await expect(custRow).toBeVisible({ timeout: 10000 });

    // 2. Navigate to Create Invoice page
    await page.goto('/sales/invoices/new');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main h1')).toHaveText('Create Commercial Invoice');

    // Select customer
    const customerSelect = page.locator('select.form-select').first();
    await customerSelect.selectOption({ label: `${customerData.name} (${customerData.currency})` });

    // Fill line item details
    const lineItemName = page.locator('input[placeholder="Item name"]').first();
    await lineItemName.fill('Cloud Infrastructure Setup & Enterprise Migration');

    const lineItemDesc = page.locator('input[placeholder="Description..."]').first();
    await lineItemDesc.fill('Turnkey cloud setup and automated backup pipelines');

    const lineRow = page.locator('.card table.enterprise-table tbody tr').first();
    const qtyInput = lineRow.locator('input[type="number"]').first();
    await qtyInput.fill('2');

    const priceInput = lineRow.locator('input[type="number"]').nth(1);
    await priceInput.fill('750');

    // Click Issue & Post to Ledger
    await page.getByRole('button', { name: 'Issue & Post to Ledger' }).click();

    // Redirection to invoices list
    await page.waitForURL('**/sales/invoices', { timeout: 15000 });
    await expect(page.locator('main h1')).toHaveText('Sales Invoices');

    // Verify invoice row is visible in table
    const row = page.locator('table.enterprise-table tbody tr', { hasText: customerData.name }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    // Extract invoice number from the same row
    const invoiceNumber = (await row.locator('td').first().locator('span').innerText()).trim();
    expect(invoiceNumber).toMatch(/^INV-/);
    createdInvoiceNumbers.push(invoiceNumber);

    // Verify database record
    const dbInvoice = await getDbInvoice(invoiceNumber);
    expect(dbInvoice).not.toBeNull();
    expect(dbInvoice.currency).toBe('USD');
    expect(dbInvoice.status).toBe('ISSUED');
    expect(parseFloat(dbInvoice.totalAmount.toString())).toBe(1500);
  });

  test('3. Verify POS Thermal Receipt slip view', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/sales/invoices');
    await page.waitForLoadState('domcontentloaded');

    // Find our created invoice row
    const firstInvoiceNumber = createdInvoiceNumbers[0];
    const row = page.locator('table.enterprise-table tbody tr', { hasText: firstInvoiceNumber }).first();
    await expect(row).toBeVisible();

    // Click Slip button and wait for popup/navigation
    const slipLink = row.getByRole('link', { name: 'Slip' });
    const href = await slipLink.getAttribute('href');
    expect(href).toContain('/receipt');

    await page.goto(href);
    await page.waitForLoadState('domcontentloaded');

    // Wait for receipt data to load
    await expect(page.getByText('Loading Thermal POS Slip...')).toBeHidden({ timeout: 15000 });

    // Verify thermal receipt components using exact match to prevent strict mode errors
    await expect(page.getByText(firstInvoiceNumber, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Cloud Infrastructure Setup & Enterprise Migration').first()).toBeVisible();
    await expect(page.getByText('1500.00').first()).toBeVisible();
  });

  test('4. Verify Vector PDF generation API', async ({ page }) => {
    await loginAsAdmin(page);

    const firstInvoiceNumber = createdInvoiceNumbers[0];
    const dbInvoice = await getDbInvoice(firstInvoiceNumber);
    expect(dbInvoice).not.toBeNull();

    // Request the PDF API endpoint using page.request (authenticated session)
    const response = await page.request.get(`/api/invoices/${dbInvoice._id}/pdf`, { timeout: 30000 });
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/pdf');

    const buffer = await response.body();
    expect(buffer.length).toBeGreaterThan(500);
  });

  test('5. Performs invoice voiding and double-entry reversal', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/sales/invoices');
    await page.waitForLoadState('domcontentloaded');

    const firstInvoiceNumber = createdInvoiceNumbers[0];
    const row = page.locator('table.enterprise-table tbody tr', { hasText: firstInvoiceNumber }).first();
    await expect(row).toBeVisible();

    // Accept confirm dialogue
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure you want to VOID invoice');
      await dialog.accept();
    });

    // Click Void button
    const voidBtn = row.getByRole('button', { name: 'Void' });
    await voidBtn.click();

    // Verify status changes to VOID
    await expect(row.locator('.badge-void', { hasText: 'VOID' })).toBeVisible({ timeout: 10000 });

    // Verify DB status
    const updatedDbInvoice = await getDbInvoice(firstInvoiceNumber);
    expect(updatedDbInvoice.status).toBe('VOID');
  });
});
