import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, withTransaction } from '@/lib/db';
import { financial, toDecimal, toDecimal128 } from '@/lib/decimal';
import { Organization, User, Account, OrganizationMembership } from '@/models';
import { initializeOrganizationDefaults, STANDARD_ACCOUNTS } from '@/lib/org-init';
import mongoose from 'mongoose';

describe('Milestone 1: Foundations, Transactions & Organization Setup', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('Verifies Decimal.js precision and arithmetic', () => {
    // 0.1 + 0.2 in standard floating point is 0.30000000000000004
    // In Decimal.js it must be exactly 0.3
    const sum = financial.add('0.1', '0.2');
    expect(sum.toString()).toBe('0.3');

    // 1000 USD * 85.50 INR rate = 85500 INR
    const converted = financial.mul('1000.00', '85.50');
    expect(converted.toFixed(2)).toBe('85500.00');

    // Decimal128 conversion
    const d128 = toDecimal128('85500.5000');
    expect(toDecimal(d128).toFixed(2)).toBe('85500.50');
  });

  it('Executes multi-document transaction and tests ACID rollback', async () => {
    const testOrgName = `Rollback Test Org ${Date.now()}`;

    // Expect transaction to abort and not leave partial writes
    let caughtError = false;
    try {
      await withTransaction(async (session) => {
        await Organization.create([{
          name: testOrgName,
          legalName: testOrgName,
          baseCurrency: 'INR'
        }], { session });

        // Intentional error inside transaction
        throw new Error('Simulated transaction failure for ACID rollback verification');
      });
    } catch (err) {
      caughtError = true;
      expect(err.message).toContain('Simulated transaction failure');
    }

    expect(caughtError).toBe(true);

    // Verify organization was rolled back and NOT inserted
    const found = await Organization.findOne({ name: testOrgName });
    expect(found).toBeNull();
  });

  it('Successfully initializes an Organization with Chart of Accounts in a transaction', async () => {
    const orgName = `Levroun Test Corp ${Date.now()}`;

    const created = await withTransaction(async (session) => {
      const [org] = await Organization.create([{
        name: orgName,
        legalName: `${orgName} Pvt Ltd`,
        baseCurrency: 'INR'
      }], { session });

      await initializeOrganizationDefaults(org, session);
      return org;
    });

    expect(created).toBeDefined();
    expect(created.name).toBe(orgName);

    // Verify all standard accounts were generated for this org
    const accounts = await Account.find({ organizationId: created._id });
    expect(accounts.length).toBe(STANDARD_ACCOUNTS.length);

    const accountCodes = accounts.map(a => a.code);
    expect(accountCodes).toContain('1010'); // Cash
    expect(accountCodes).toContain('1020'); // Bank
    expect(accountCodes).toContain('1100'); // Accounts Receivable
    expect(accountCodes).toContain('1200'); // Inventory Asset
    expect(accountCodes).toContain('2010'); // Accounts Payable
    expect(accountCodes).toContain('4010'); // Sales Revenue
    expect(accountCodes).toContain('4090'); // Exchange Gain
    expect(accountCodes).toContain('5010'); // COGS
    expect(accountCodes).toContain('5090'); // Exchange Loss

    // Clean up test org and its accounts
    await Organization.deleteOne({ _id: created._id });
    await Account.deleteMany({ organizationId: created._id });
  });
});
