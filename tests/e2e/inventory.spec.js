import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { createProductData } from '../fixtures/factories.js';
import { cleanupTargetedTestRecords } from '../helpers/test-cleanup.js';

test.describe('Phase 2 — Inventory & Stock Movements Automation', () => {
  test.describe.configure({ mode: 'serial' });

  const createdProductSkus = [];

  test.afterAll(async () => {
    await cleanupTargetedTestRecords({
      productSkus: createdProductSkus
    });
  });

  test('1. Navigate to Stock Movements and verify table structure', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/inventory/movements');
    await page.waitForLoadState('domcontentloaded');

    // Verify page header
    await expect(page.locator('main h1')).toHaveText('Stock Movements History');
    await expect(
      page.locator('text=Complete chronological audit trail of all inventory receipts, sale deductions, and adjustments')
    ).toBeVisible();

    // Verify New Stock Adjustment CTA
    await expect(page.getByRole('link', { name: 'New Stock Adjustment' })).toBeVisible();

    // Verify table headers
    const expectedHeaders = [
      'Date',
      'Product Name',
      'SKU',
      'Movement Type',
      'Quantity',
      'Unit Cost (INR)',
      'Total Valuation (INR)',
      'Reference / Notes'
    ];
    for (const header of expectedHeaders) {
      await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
    }
  });

  test('2. Records stock adjustment (ADJUSTMENT_IN) and logs inventory movement', async ({ page }) => {
    await loginAsAdmin(page);

    // 1. Create a physical product with inventory tracking
    const productData = createProductData({ purchasePrice: '500.00' });
    createdProductSkus.push(productData.sku);

    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeVisible();

    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill(productData.name);
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(productData.sku);
    await page.locator('select.form-select').first().selectOption('GOODS');
    await page.locator('input[placeholder="pcs, box, hrs"]').fill(productData.unit);
    await page.locator('select.form-select').nth(1).selectOption(productData.taxRate);

    await page.locator('input[type="number"][step="0.01"]').first().fill(productData.purchasePrice);
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill(productData.sellingPrice);

    await page.locator('input[type="number"][step="1"]').first().fill(productData.openingStock);
    await page.locator('input[type="number"][step="1"]').nth(1).fill(productData.reorderLevel.toString());

    await page.getByRole('button', { name: 'Save Product' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden({ timeout: 10000 });

    // 2. Navigate to Stock Adjustments
    await page.goto('/inventory/adjustments');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('main h1')).toHaveText('Stock Adjustments');

    // Select our created product
    const productSelect = page.locator('form select.form-select').first();
    const optionValue = await productSelect.locator(`option:has-text("${productData.sku}")`).getAttribute('value');
    await productSelect.selectOption(optionValue);

    // Select Stock In (+ Increase Stock)
    const typeSelect = page.locator('form select.form-select').nth(1);
    await typeSelect.selectOption('ADJUSTMENT_IN');

    // Set adjustment quantity
    const qtyInput = page.locator('form input[type="number"]');
    await qtyInput.fill('15');

    // Reason
    const uniqueReason = `Physical audit reconciliation #${Date.now().toString().slice(-6)}`;
    await page.locator('form textarea').fill(uniqueReason);

    // Submit adjustment
    await page.getByRole('button', { name: 'Apply Stock Adjustment' }).click();

    // Verify redirected to movements
    await page.waitForURL('**/inventory/movements', { timeout: 15000 });
    await expect(page.locator('main h1')).toHaveText('Stock Movements History');

    // Verify movement row is listed
    const movementRow = page.locator('table.enterprise-table tbody tr', { hasText: productData.sku }).first();
    await expect(movementRow).toBeVisible({ timeout: 10000 });
    await expect(movementRow).toContainText('ADJUSTMENT_IN');
    await expect(movementRow).toContainText('+15');
    await expect(movementRow).toContainText(uniqueReason);
  });
});
