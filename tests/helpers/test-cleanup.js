import mongoose from 'mongoose';
import { validateTestDatabase } from './db-safety.js';

/**
 * Connects directly to verified test DB for scoped assertions.
 */
async function ensureTestConnection() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/fin_billing_test?replicaSet=rs0&directConnection=true';
  validateTestDatabase(uri);

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }
  return mongoose.connection;
}

/**
 * Scoped cleanup: strictly deletes ONLY the IDs created during test runs.
 * Never performs broad collection wiping.
 */
export async function cleanupTargetedTestRecords({ customerCodes = [], supplierCodes = [], productSkus = [], invoiceNumbers = [] }) {
  const conn = await ensureTestConnection();
  const db = conn.db;

  if (customerCodes.length > 0) {
    await db.collection('customers').deleteMany({ code: { $in: customerCodes } });
  }
  if (supplierCodes.length > 0) {
    await db.collection('suppliers').deleteMany({ code: { $in: supplierCodes } });
  }
  if (productSkus.length > 0) {
    const products = await db.collection('products').find({ sku: { $in: productSkus } }).toArray();
    const productIds = products.map(p => p._id);
    await db.collection('products').deleteMany({ sku: { $in: productSkus } });
    if (productIds.length > 0) {
      await db.collection('stockbalances').deleteMany({ productId: { $in: productIds } });
      await db.collection('inventorymovements').deleteMany({ productId: { $in: productIds } });
    }
  }
  if (invoiceNumbers.length > 0) {
    const invs = await db.collection('invoices').find({ invoiceNumber: { $in: invoiceNumbers } }).toArray();
    const invIds = invs.map(i => i._id);
    await db.collection('invoices').deleteMany({ invoiceNumber: { $in: invoiceNumbers } });
    if (invIds.length > 0) {
      await db.collection('journalentries').deleteMany({ referenceId: { $in: invIds } });
      await db.collection('payments').deleteMany({ invoiceId: { $in: invIds } });
    }
  }
}

/**
 * Organization-scoped DB query helpers to verify Mongoose persistence.
 */
export async function getDbCustomer(code) {
  const conn = await ensureTestConnection();
  return conn.db.collection('customers').findOne({ code });
}

export async function getDbSupplier(code) {
  const conn = await ensureTestConnection();
  return conn.db.collection('suppliers').findOne({ code });
}

export async function getDbProduct(sku) {
  const conn = await ensureTestConnection();
  return conn.db.collection('products').findOne({ sku: sku.toUpperCase() });
}

export async function getDbInvoice(invoiceNumber) {
  const conn = await ensureTestConnection();
  return conn.db.collection('invoices').findOne({ invoiceNumber });
}

export async function setCustomerActiveState(code, isActive) {
  const conn = await ensureTestConnection();
  return conn.db.collection('customers').updateOne({ code }, { $set: { isActive } });
}

export async function setSupplierActiveState(code, isActive) {
  const conn = await ensureTestConnection();
  return conn.db.collection('suppliers').updateOne({ code }, { $set: { isActive } });
}

export async function setProductActiveState(sku, isActive) {
  const conn = await ensureTestConnection();
  return conn.db.collection('products').updateOne({ sku: sku.toUpperCase() }, { $set: { isActive } });
}
