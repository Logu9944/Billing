import { test, expect } from '../fixtures/test-fixtures.js';
import { loginAsAdmin } from '../helpers/auth.js';
import { getDbCustomer, getDbSupplier, getDbProduct } from '../helpers/test-cleanup.js';
import mongoose from 'mongoose';

test.describe('Phase 2 — Multi-Tenancy & Authorization Security', () => {

  test('1. Unauthenticated users cannot access core management routes', async ({ page, context }) => {
    await context.clearCookies();

    const protectedUrls = [
      '/sales/customers',
      '/purchases/suppliers',
      '/inventory/products'
    ];

    for (const url of protectedUrls) {
      await page.goto(url);
      await page.waitForURL('**/login', { timeout: 10000 });
      expect(page.url()).toContain('/login');
    }
  });

  test('2. Unauthenticated direct API mutation requests fail safely with 401', async ({ request }) => {
    // Attempt unauthorized POST to /api/customers
    const custRes = await request.post('/api/customers', {
      data: { name: 'Unauthorized Customer', currency: 'USD' }
    });
    expect(custRes.status()).toBe(401);

    // Attempt unauthorized POST to /api/suppliers
    const suppRes = await request.post('/api/suppliers', {
      data: { name: 'Unauthorized Supplier', currency: 'INR' }
    });
    expect(suppRes.status()).toBe(401);

    // Attempt unauthorized POST to /api/products
    const prodRes = await request.post('/api/products', {
      data: { name: 'Unauthorized Product', sku: 'UNAUTH-01', sellingPrice: 100 }
    });
    expect(prodRes.status()).toBe(401);
  });

  test('3. Organization tenancy scoping invariant', async ({ page }) => {
    // Fetch seeded organization ID
    await loginAsAdmin(page);

    if (mongoose.connection.readyState !== 1) {
      const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/fin_billing?replicaSet=rs0&directConnection=true';
      await mongoose.connect(uri);
    }

    const db = mongoose.connection.db;
    const org = await db.collection('organizations').findOne({ name: 'Levroun India Private Limited' });
    expect(org).not.toBeNull();
    const orgId = org._id;

    // Verify all customers, suppliers, and products are strictly scoped to an organizationId
    const unattachedCustomers = await db.collection('customers').countDocuments({ organizationId: { $ne: orgId } });
    const unattachedSuppliers = await db.collection('suppliers').countDocuments({ organizationId: { $ne: orgId } });
    const unattachedProducts = await db.collection('products').countDocuments({ organizationId: { $ne: orgId } });

    expect(unattachedCustomers).toBe(0);
    expect(unattachedSuppliers).toBe(0);
    expect(unattachedProducts).toBe(0);
  });

});
