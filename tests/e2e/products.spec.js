import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { createProductData, createServiceData } from '../fixtures/factories.js';
import { 
  cleanupTargetedTestRecords, 
  getDbProduct, 
  setProductActiveState 
} from '../helpers/test-cleanup.js';

test.describe('Phase 2 — Product & Service Management Automation', () => {
  const createdSkus = [];

  test.afterAll(async () => {
    if (createdSkus.length > 0) {
      await cleanupTargetedTestRecords({ productSkus: createdSkus });
    }
  });

  test('1. Navigate to Products & Services module and verify catalog view', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    // Verify page header
    await expect(page.locator('main h1')).toHaveText('Products & Services');
    await expect(
      page.locator('text=Catalog of goods and services, SKU configurations, pricing, and stock balances')
    ).toBeVisible();

    // Verify search input, refresh button, and New Product CTA
    await expect(page.getByPlaceholder('Search by SKU, product name...')).toBeVisible();
    await expect(page.getByTitle('Refresh')).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Product / Service' })).toBeVisible();
  });

  test('2. Create a physical product (GOODS) with inventory tracking & verify listing and reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    const productData = createProductData();
    createdSkus.push(productData.sku);

    // Open modal
    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeVisible();

    // Fill Goods product fields
    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill(productData.name);
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(productData.sku);
    await page.locator('select.form-select').first().selectOption('GOODS');
    await page.locator('input[placeholder="pcs, box, hrs"]').fill(productData.unit);
    await page.locator('select.form-select').nth(1).selectOption(productData.taxRate);

    // Pricing
    await page.locator('input[type="number"][step="0.01"]').first().fill(productData.purchasePrice);
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill(productData.sellingPrice);

    // Goods inventory fields (Opening stock & Reorder level)
    await page.locator('input[type="number"][step="1"]').first().fill(productData.openingStock);
    await page.locator('input[type="number"][step="1"]').nth(1).fill(productData.reorderLevel.toString());

    // Description
    await page.locator('textarea.form-textarea').fill(productData.description);

    // Submit form
    await page.getByRole('button', { name: 'Save Product' }).click();

    // Verify modal closes
    await expect(page.getByText('Create Product / Service Item')).toBeHidden({ timeout: 10000 });

    // Verify product appears in catalog table
    const row = page.locator('table.enterprise-table tbody tr', { hasText: productData.sku });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(productData.name);
    await expect(row).toContainText('GOODS');
    await expect(row).toContainText(`${productData.taxRate}%`);
    await expect(row).toContainText(`${productData.openingStock} ${productData.unit}`);
    await expect(row).toContainText('IN STOCK');

    // Reload page to verify persistence
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const rowAfterReload = page.locator('table.enterprise-table tbody tr', { hasText: productData.sku });
    await expect(rowAfterReload).toBeVisible({ timeout: 10000 });
    await expect(rowAfterReload).toContainText(productData.name);

    // Database verification: Verify product and stock tracking
    const dbProduct = await getDbProduct(productData.sku);
    expect(dbProduct).not.toBeNull();
    expect(dbProduct.type).toBe('GOODS');
    expect(dbProduct.trackInventory).toBe(true);
    expect(parseFloat(dbProduct.currentStock.toString())).toBe(parseFloat(productData.openingStock));
  });

  test('3. Create a service item and verify non-inventory behavior', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    const serviceData = createServiceData();
    createdSkus.push(serviceData.sku);

    // Open modal
    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeVisible();

    // Fill Service fields
    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill(serviceData.name);
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(serviceData.sku);
    
    // Switch type to SERVICE
    await page.locator('select.form-select').first().selectOption('SERVICE');

    // Verify Opening Stock and Reorder Level inputs are hidden for Service items
    await expect(page.getByText('Opening Stock Quantity')).toBeHidden();
    await expect(page.getByText('Low Stock Reorder Level')).toBeHidden();

    // Set selling price
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill(serviceData.sellingPrice);

    // Submit form
    await page.getByRole('button', { name: 'Save Product' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden({ timeout: 10000 });

    // Verify service item appears in catalog table
    const row = page.locator('table.enterprise-table tbody tr', { hasText: serviceData.sku });
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row).toContainText(serviceData.name);
    await expect(row).toContainText('SERVICE');
    // Stock on Hand column should show '—'
    await expect(row.locator('td').nth(6)).toHaveText('—');
    await expect(row).toContainText('SERVICE');

    // Database verification: trackInventory must be false
    const dbService = await getDbProduct(serviceData.sku);
    expect(dbService).not.toBeNull();
    expect(dbService.type).toBe('SERVICE');
    expect(dbService.trackInventory).toBe(false);
  });

  test('4. Duplicate SKU validation enforcement', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    // Create an initial product
    const initialProduct = createProductData();
    createdSkus.push(initialProduct.sku);

    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill(initialProduct.name);
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(initialProduct.sku);
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill(initialProduct.sellingPrice);
    await page.getByRole('button', { name: 'Save Product' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden();

    // Now attempt to create another product with the EXACT SAME SKU
    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill('Different Product Name');
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(initialProduct.sku);
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill('999.00');
    await page.getByRole('button', { name: 'Save Product' }).click();

    // Server should reject and modal display error banner
    await expect(page.getByText(`Product with SKU "${initialProduct.sku}" already exists`)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Create Product / Service Item')).toBeVisible();

    // Cancel modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden();
  });

  test('5. Form validation for products (required fields)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeVisible();

    const nameInput = page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]');
    const skuInput = page.locator('input[placeholder="e.g. PROD-SRV-01"]');
    const priceInput = page.locator('input[type="number"][step="0.01"]').nth(1);

    // Verify required HTML5 attributes
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(skuInput).toHaveAttribute('required', '');
    await expect(priceInput).toHaveAttribute('required', '');

    // Close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden();
  });

  test('6. Search and filtering for products', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    const searchTarget = createProductData({ name: `Searchable Optics ${Date.now()}` });
    createdSkus.push(searchTarget.sku);

    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill(searchTarget.name);
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(searchTarget.sku);
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill(searchTarget.sellingPrice);
    await page.getByRole('button', { name: 'Save Product' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden();

    const searchInput = page.getByPlaceholder('Search by SKU, product name...');

    // Search by SKU
    await searchInput.fill(searchTarget.sku);
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: searchTarget.sku })).toBeVisible();

    // Non-existent search
    await searchInput.fill('NON_EXISTENT_SKU_00000');
    await expect(page.locator('text=No items in catalog')).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: searchTarget.sku })).toBeVisible();
  });

  test('7. Archiving / soft-delete workflow for products', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    const archProduct = createProductData({ name: `Archive Product ${Date.now()}` });
    createdSkus.push(archProduct.sku);

    await page.getByRole('button', { name: 'New Product / Service' }).click();
    await page.locator('input[placeholder="e.g. Enterprise License or Dell Server"]').fill(archProduct.name);
    await page.locator('input[placeholder="e.g. PROD-SRV-01"]').fill(archProduct.sku);
    await page.locator('input[type="number"][step="0.01"]').nth(1).fill(archProduct.sellingPrice);
    await page.getByRole('button', { name: 'Save Product' }).click();
    await expect(page.getByText('Create Product / Service Item')).toBeHidden();

    // Verify visible initially
    await expect(page.locator('table.enterprise-table tbody tr', { hasText: archProduct.sku })).toBeVisible();

    // Soft delete via lifecycle state
    await setProductActiveState(archProduct.sku, false);

    // Reload page to verify excluded from active catalog
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const searchInput = page.getByPlaceholder('Search by SKU, product name...');
    await searchInput.fill(archProduct.sku);
    await expect(page.locator('text=No items in catalog')).toBeVisible();

    // Database verification: Verify record is inactive
    const dbRecord = await getDbProduct(archProduct.sku);
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.isActive).toBe(false);
  });

  test('8. UI capabilities audit — in-place edit & deletion controls', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/inventory/products');
    await page.waitForLoadState('domcontentloaded');

    // Audit V1.0 table headers
    const headers = await page.locator('table.enterprise-table thead th').allTextContents();
    expect(headers).toContain('SKU');
    expect(headers).toContain('Product / Service Name');
    expect(headers).toContain('Type');

    const actionHeader = headers.find(h => /action|edit|manage/i.test(h));
    expect(actionHeader).toBeDefined();
  });

});
