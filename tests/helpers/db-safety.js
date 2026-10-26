import mongoose from 'mongoose';
import { 
  Organization, 
  User, 
  OrganizationMembership, 
  CurrencyRate, 
  Account, 
  Customer, 
  Supplier, 
  Product, 
  Invoice, 
  Payment, 
  JournalEntry,
  StockBalance,
  SupplierBill
} from '../../src/models/index.js';
import { initializeOrganizationDefaults } from '../../src/lib/org-init.js';
import { hashPassword } from '../../src/lib/auth.js';

const TEST_DB_SUBSTRING = 'test';

/**
 * Validates that the provided MongoDB URI is strictly a designated test database.
 * Throws a fatal exception if it detects production or non-test database targets.
 */
export function validateTestDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('FATAL SAFETY ERROR: MONGODB_URI is not set.');
  }

  // Extract database name from URI
  const dbMatch = uri.match(/\/([a-zA-Z0-9_\-]+)(?:\?|$)/);
  const dbName = dbMatch ? dbMatch[1] : '';

  if (!dbName.toLowerCase().includes(TEST_DB_SUBSTRING)) {
    throw new Error(
      `FATAL SAFETY VIOLATION: Refusing to perform test database operations. ` +
      `Target database "${dbName}" does not contain "${TEST_DB_SUBSTRING}". ` +
      `Automated tests must never target development or production databases!`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SAFETY VIOLATION: Cannot run test database routines when NODE_ENV=production!');
  }

  return dbName;
}

/**
 * Connects to the test database safely with validation.
 */
export async function connectTestDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27018/fin_billing_test?replicaSet=rs0&directConnection=true';
  const validatedDbName = validateTestDatabase(uri);

  if (mongoose.connection.readyState === 1) {
    // Already connected, verify active database name
    if (mongoose.connection.name !== validatedDbName) {
      await mongoose.disconnect();
    } else {
      return mongoose.connection;
    }
  }

  await mongoose.connect(uri, {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000
  });

  if (!mongoose.connection.name.toLowerCase().includes(TEST_DB_SUBSTRING)) {
    await mongoose.disconnect();
    throw new Error(`CRITICAL: Connected to non-test database "${mongoose.connection.name}". Connection aborted.`);
  }

  return mongoose.connection;
}

/**
 * Safely cleans test collections in the verified test database.
 */
export async function cleanTestEnvironment() {
  await connectTestDB();
  const dbName = mongoose.connection.name;
  if (!dbName.toLowerCase().includes(TEST_DB_SUBSTRING)) {
    throw new Error(`CRITICAL: Refusing to clean non-test database "${dbName}".`);
  }

  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

/**
 * Seeds base test organization, admin user, and chart of accounts.
 */
export async function seedTestEnvironment() {
  await connectTestDB();

  const testEmail = process.env.TEST_USER_EMAIL || 'testadmin@levroun.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
  const orgName = process.env.TEST_ORG_NAME || 'Levroun India Private Limited';
  const baseCurrency = process.env.TEST_BASE_CURRENCY || 'INR';

  const session = await mongoose.startSession();
  let seededOrg, seededUser;

  try {
    await session.withTransaction(async () => {
      // 1. Organization
      seededOrg = await Organization.findOne({ name: orgName }).session(session);
      if (!seededOrg) {
        [seededOrg] = await Organization.create([{
          name: orgName,
          legalName: orgName,
          taxId: '29AABCL1234F1Z5',
          baseCurrency,
          fiscalYearStartMonth: 4,
          email: 'accounts@levroun.com',
          phone: '+91 80 4455 8899',
          website: 'https://www.levroun.com',
          address: {
            street: 'Levroun Technology Tower, Outer Ring Road',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            postalCode: '560103'
          }
        }], { session });

        await initializeOrganizationDefaults(seededOrg, session);
      }

      // 2. User
      seededUser = await User.findOne({ email: testEmail }).session(session);
      if (!seededUser) {
        const passwordHash = await hashPassword(testPassword);
        [seededUser] = await User.create([{
          name: 'Playwright Test Admin',
          email: testEmail,
          passwordHash,
          systemRole: 'SUPER_ADMIN'
        }], { session });
      }

      // 3. Membership
      const existingMembership = await OrganizationMembership.findOne({
        organizationId: seededOrg._id,
        userId: seededUser._id
      }).session(session);

      if (!existingMembership) {
        await OrganizationMembership.create([{
          organizationId: seededOrg._id,
          userId: seededUser._id,
          role: 'OWNER',
          isDefault: true
        }], { session });
      }

      // 4. Base FX rates
      const fxRates = [
        { fromCurrency: 'USD', toCurrency: 'INR', rate: 84.50 },
        { fromCurrency: 'EUR', toCurrency: 'INR', rate: 91.20 },
        { fromCurrency: 'GBP', toCurrency: 'INR', rate: 106.80 },
      ];

      for (const fx of fxRates) {
        await CurrencyRate.findOneAndUpdate(
          { organizationId: seededOrg._id, fromCurrency: fx.fromCurrency, toCurrency: fx.toCurrency },
          { $set: { rate: fx.rate, effectiveDate: new Date(), source: 'E2E_SEED' } },
          { upsert: true, session }
        );
      }
    });

    return { organization: seededOrg, user: seededUser };
  } finally {
    await session.endSession();
  }
}
