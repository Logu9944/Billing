'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Lock, Mail, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import PWAInstallBanner from '@/components/PWAInstallBanner';
import OfflineIndicator from '@/components/OfflineIndicator';

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [email, setEmail] = useState('adhurva@levroun.com');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Adhurva Architect');
  const [orgName, setOrgName] = useState('Levroun India Private Limited');
  const [baseCurrency, setBaseCurrency] = useState('INR');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegister 
        ? { email, password, name, organizationName: orgName, baseCurrency }
        : { email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-offwhite)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--color-white)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-subtle)',
        overflow: 'hidden'
      }}>
        {/* Header Header */}
        <div style={{
          backgroundColor: 'var(--color-dark-navy)',
          padding: '24px',
          color: '#FFFFFF',
          borderBottom: '2px solid var(--color-sky-blue)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'var(--color-sky-blue)',
              color: 'var(--color-dark-navy)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '16px'
            }}>L</div>
            <span style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '0.5px' }}>LEVROUN ERP</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            Industry-Grade Multi-Currency Billing & Double-Entry Accounting System
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger-border)',
              borderRadius: 'var(--radius-input)',
              padding: '10px 12px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <form 
            onSubmit={handleSubmit} 
            data-hydrated={mounted ? "true" : "false"}
          >
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adhurva S"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Organization Legal Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Levroun India Private Limited"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Base Accounting Currency</label>
                  <select
                    className="form-select"
                    value={baseCurrency}
                    onChange={(e) => setBaseCurrency(e.target.value)}
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@levroun.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '12px', padding: '10px' }}
            >
              {loading ? 'Processing...' : (isRegister ? 'Initialize Organization & Workspace' : 'Sign In to Workspace')}
              <ArrowRight size={14} />
            </button>
          </form>

          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-text-secondary)'
          }}>
            {isRegister ? (
              <span>Already registered?{' '}
                <button 
                  type="button" 
                  onClick={() => { setIsRegister(false); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-deep-blue)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>Need a new organization?{' '}
                <button 
                  type="button" 
                  onClick={() => { setIsRegister(true); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-deep-blue)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Set up Organization
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
      <OfflineIndicator />
      <PWAInstallBanner />
    </div>
  );
}
