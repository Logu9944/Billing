'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Save, RefreshCw, Coins, Building2, CheckCircle2, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    invoicePrefix: 'INV-',
    billPrefix: 'BILL-',
    paymentPrefix: 'PAY-',
    journalPrefix: 'JE-',
    defaultPaymentTermsDays: 30,
    termsAndConditions: '',
    notes: ''
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.settings) {
          setForm({
            invoicePrefix: json.data.settings.invoicePrefix || 'INV-',
            billPrefix: json.data.settings.billPrefix || 'BILL-',
            paymentPrefix: json.data.settings.paymentPrefix || 'PAY-',
            journalPrefix: json.data.settings.journalPrefix || 'JE-',
            defaultPaymentTermsDays: json.data.settings.defaultPaymentTermsDays || 30,
            termsAndConditions: json.data.settings.termsAndConditions || '',
            notes: json.data.settings.notes || ''
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save settings');
      }
      setMsg('Settings updated successfully');
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncRates = async () => {
    try {
      setSyncing(true);
      setMsg('');
      const res = await fetch('/api/settings/rates/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to sync live rates');
      }
      setMsg(json.message || 'Live currency rates synchronized successfully!');
      setTimeout(() => setMsg(''), 5000);
      loadSettings();
    } catch (err) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const org = data?.organization;
  const rates = data?.rates || [];

  return (
    <AppLayout
      title="Organization Settings"
      subtitle="Corporate parameters, document prefixes, multi-currency conversion matrix, and audit compliance"
      actions={
        <button className="btn btn-secondary" onClick={loadSettings}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      }
    >
      {msg && (
        <div style={{
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-success)',
          padding: '10px 14px',
          borderRadius: '4px',
          marginBottom: '16px',
          fontSize: '13px',
          border: '1px solid var(--color-success-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{msg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Form Settings */}
        <form onSubmit={handleSave}>
          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-dark-navy)' }}>
              Document Sequence & Prefixes
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Invoice Prefix</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Bill Prefix</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.billPrefix}
                  onChange={(e) => setForm({ ...form, billPrefix: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Payment Receipt Prefix</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.paymentPrefix}
                  onChange={(e) => setForm({ ...form, paymentPrefix: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Journal Entry Prefix</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.journalPrefix}
                  onChange={(e) => setForm({ ...form, journalPrefix: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Default Payment Terms (Days)</label>
              <input
                type="number"
                className="form-input"
                value={form.defaultPaymentTermsDays}
                onChange={(e) => setForm({ ...form, defaultPaymentTermsDays: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', color: 'var(--color-dark-navy)' }}>
              Standard Invoice Terms & Conditions
            </h3>

            <div className="form-group">
              <label className="form-label">Default Invoice Terms & Conditions</label>
              <textarea
                className="form-textarea"
                rows="3"
                value={form.termsAndConditions}
                onChange={(e) => setForm({ ...form, termsAndConditions: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Invoice Remittance Notes</label>
              <textarea
                className="form-textarea"
                rows="2"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ marginTop: '8px' }}>
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>

        {/* Organization Info & Currency Rates Table */}
        <div>
          <div className="card" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Building2 size={16} color="var(--color-deep-blue)" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-dark-navy)', margin: 0 }}>
                Corporate Profile
              </h3>
            </div>

            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Legal Entity:</strong> {org?.legalName || org?.name}</div>
              <div><strong>Base Accounting Currency:</strong> {org?.baseCurrency} (Immutable)</div>
              <div><strong>GSTIN / Tax ID:</strong> {org?.taxId || '29AABCL1234F1Z5'}</div>
              <div><strong>Registered Address:</strong> Bangalore, Karnataka, India</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              backgroundColor: '#F8FAFC',
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Coins size={16} color="var(--color-sky-blue)" />
                <span>Configured Currency Rates</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSyncRates}
                disabled={syncing}
                style={{ borderColor: 'var(--color-sky-blue)', color: 'var(--color-deep-blue)' }}
                title="Fetch updated exchange rates from Central Bank & Global Feeds"
              >
                <Globe size={13} />
                <span>{syncing ? 'Syncing...' : 'Sync Live Rates'}</span>
              </button>
            </div>

            <table className="enterprise-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ textAlign: 'right' }}>Rate (Multiplier)</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.fromCurrency}</td>
                    <td style={{ fontWeight: 600 }}>{r.toCurrency}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {parseFloat(r.rate).toFixed(4)}
                    </td>
                    <td style={{ fontSize: '11px', color: '#64748B' }}>{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
