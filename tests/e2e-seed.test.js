import { describe, it, expect } from 'vitest';
import { seedTestEnvironment } from './helpers/db-safety.js';

describe('Seed E2E Test DB', () => {
  it('seeds fin_billing_test environment for Playwright', async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:27018/fin_billing_test?replicaSet=rs0&directConnection=true';
    process.env.TEST_USER_EMAIL = 'adhurva@levroun.com';
    process.env.TEST_USER_PASSWORD = 'Password123!';
    process.env.TEST_ORG_NAME = 'Levroun India Private Limited';
    process.env.TEST_BASE_CURRENCY = 'INR';

    const result = await seedTestEnvironment();
    expect(result.organization).toBeDefined();
    expect(result.user).toBeDefined();
  });
});
