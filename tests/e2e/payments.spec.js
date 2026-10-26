import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { createCustomerData } from '../fixtures/factories.js';
import { cleanupTargetedTestRecords } from '../helpers/test-cleanup.js';

test.describe('Phase 2 — Payments Received & FX Realization Automation', () => {
  test.describe.configure({ mode: 'serial' });

  const createdCustomerCodes = [];
  const createdInvoiceNumbers = [];

  test.afterAll(async () => {
    await cleanupTargetedTestRecords({
      customerCodes: createdCustomerCodes,
      invoiceNumbers: createdInvoiceNumbers
    });
  });

  test('1. Navigate to Payments module and verify table structure', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/sales/payments');
    await page.waitForLoadState('domcontentloaded');

    // Verify page header
    await expect(page.locator('main h1')).toHaveText('Payments Received');
    await expect(
      page.locator('text=Record customer remittances, calculate realized exchange differences, and update ledger balances')
    ).toBeVisible();

    // Verify Record Payment CTA
    await expect(page.getByRole('button', { name: 'Record Customer Payment' })).toBeVisible();

    // Verify table headers
    const expectedHeaders = [
      'Payment Number',
      'Customer',
      'Date',
      'Method',
      'Payment Amount',
      'Bank Received (INR)',
      'Payment Rate',
      'Reference / Notes'
    ];
    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
    }
  });

  test('2. Records customer payment and verifies realized FX gain/loss breakdown', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Create a customer
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

    // 2. Create an invoice in USD @ 85.50
    await page.goto('/sales/invoices/new');
    await page.waitForLoadState('domcontentloaded');

    const customerSelect = page.locator('select.form-select').first();
    await customerSelect.selectOption({ label: `${customerData.name} (${customerData.currency})` });

    const lineRow = page.locator('.card table.enterprise-table tbody tr').first();
    const qtyInput = lineRow.locator('input[type="number"]').first();
    await qtyInput.fill('1');

    const priceInput = lineRow.locator('input[type="number"]').nth(1);
    await priceInput.fill('1000');

    await page.getByRole('button', { name: 'Issue & Post to Ledger' }).click();
    await page.waitForURL('**/sales/invoices', { timeout: 15000 });

    const invRow = page.locator('table.enterprise-table tbody tr', { hasText: customerData.name }).first();
    await expect(invRow).toBeVisible({ timeout: 10000 });
    const invoiceNumber = (await invRow.locator('td').first().locator('span').innerText()).trim();
    createdInvoiceNumbers.push(invoiceNumber);

    // 3. Navigate to Payments module and record payment
    await page.goto('/sales/payments');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'Record Customer Payment' }).click();
    await expect(page.getByText('Record Customer Payment (Multi-Currency)')).toBeVisible();

    // Select customer
    const modalCustSelect = page.locator('form select.form-select').first();
    await modalCustSelect.selectOption({ label: `${customerData.name} (${customerData.currency})` });

    // Verify invoice is automatically selected and gain/loss breakdown renders
    await expect(page.getByText('Multi-Currency Realization Breakdown:')).toBeVisible({ timeout: 10000 });

    // Fill UTR reference
    const uniqueUtr = `UTR-${Date.now().toString().slice(-6)}`;
    await page.locator('input[placeholder="e.g. UTR-SBI-9928190"]').fill(uniqueUtr);

    // Submit payment
    await page.getByRole('button', { name: 'Record Payment & Post to Ledger' }).click();

    // Modal closes
    await expect(page.getByText('Record Customer Payment (Multi-Currency)')).toBeHidden({ timeout: 10000 });

    // Verify payment record appears in table
    const paymentRow = page.locator('table.enterprise-table tbody tr', { hasText: customerData.name }).first();
    await expect(paymentRow).toBeVisible({ timeout: 10000 });
    await expect(paymentRow).toContainText(uniqueUtr);
    await expect(paymentRow).toContainText('USD 1,000.00');

    // 4. Verify Invoice status updated to PAID
    await page.goto('/sales/invoices');
    await page.waitForLoadState('domcontentloaded');

    const updatedInvRow = page.locator('table.enterprise-table tbody tr', { hasText: invoiceNumber }).first();
    await expect(updatedInvRow.locator('.badge-paid', { hasText: 'PAID' })).toBeVisible({ timeout: 10000 });
  });
});
