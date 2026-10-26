import { describe, it, expect } from 'vitest';
import { escapeRegex, sanitizeText } from '@/lib/sanitize';
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limiter';
import { requireRole } from '@/lib/auth';
import nextConfig from '../next.config.mjs';

describe('Security Hardening & Threat Prevention Suite', () => {

  describe('1. ReDoS & NoSQL Regex Injection Prevention', () => {
    it('escapes dangerous regex special characters', () => {
      const maliciousPayload = '.*+?^${}()|[]\\test';
      const escaped = escapeRegex(maliciousPayload);
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\test');
    });

    it('prevents ReDoS by trimming long queries', () => {
      const longPayload = 'a'.repeat(300);
      const escaped = escapeRegex(longPayload);
      expect(escaped.length).toBe(100);
    });

    it('strips control characters and null bytes', () => {
      const dirty = 'SafeText\u0000\u0008\u001F';
      const cleaned = sanitizeText(dirty);
      expect(cleaned).toBe('SafeText');
    });
  });

  describe('2. Brute-Force Rate Limiting Engine', () => {
    const testKey = 'test_user_ip_security_spec';

    it('allows initial login attempts and blocks after threshold', () => {
      clearRateLimit(testKey);

      // Attempts 1 to 5 should be allowed
      for (let i = 1; i <= 5; i++) {
        const check = checkRateLimit(testKey, 5, 60000);
        expect(check.allowed).toBe(true);
        recordFailedAttempt(testKey, 5, 60000);
      }

      // 6th attempt MUST be blocked
      const blockedCheck = checkRateLimit(testKey, 5, 60000);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.retryAfterSec).toBeGreaterThan(0);

      // Clear rate limit simulates successful login
      clearRateLimit(testKey);
      const afterClear = checkRateLimit(testKey, 5, 60000);
      expect(afterClear.allowed).toBe(true);
    });
  });

  describe('3. Role-Based Access Control (RBAC) Invariant', () => {
    it('permits OWNER, ADMIN, and ACCOUNTANT to perform mutations', () => {
      expect(() => requireRole({ role: 'OWNER' })).not.toThrow();
      expect(() => requireRole({ role: 'ADMIN' })).not.toThrow();
      expect(() => requireRole({ role: 'ACCOUNTANT' })).not.toThrow();
    });

    it('strictly blocks VIEWER from mutating financial records (403 Forbidden)', () => {
      expect(() => requireRole({ role: 'VIEWER' })).toThrow(/Forbidden/);
      expect(() => requireRole({ role: 'GUEST' })).toThrow(/Forbidden/);
    });

    it('enforces OWNER/ADMIN only for sensitive settings updates', () => {
      expect(() => requireRole({ role: 'ACCOUNTANT' }, ['OWNER', 'ADMIN'])).toThrow(/Forbidden/);
      expect(() => requireRole({ role: 'ADMIN' }, ['OWNER', 'ADMIN'])).not.toThrow();
      expect(() => requireRole({ role: 'OWNER' }, ['OWNER', 'ADMIN'])).not.toThrow();
    });
  });

  describe('4. HTTP Defense-in-Depth Security Headers', () => {
    it('defines mandatory HTTP security headers in next.config.mjs', async () => {
      const headersConfig = await nextConfig.headers();
      expect(Array.isArray(headersConfig)).toBe(true);
      const globalHeaders = headersConfig.find(h => h.source === '/:path*')?.headers;
      expect(globalHeaders).toBeDefined();

      const headerKeys = globalHeaders.map(h => h.key);
      expect(headerKeys).toContain('X-Frame-Options');
      expect(headerKeys).toContain('X-Content-Type-Options');
      expect(headerKeys).toContain('Referrer-Policy');
      expect(headerKeys).toContain('Permissions-Policy');

      const frameOptions = globalHeaders.find(h => h.key === 'X-Frame-Options');
      expect(frameOptions.value).toBe('SAMEORIGIN');

      const contentType = globalHeaders.find(h => h.key === 'X-Content-Type-Options');
      expect(contentType.value).toBe('nosniff');
    });
  });

});
