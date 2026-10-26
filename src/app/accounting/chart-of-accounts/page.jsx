'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Layers, RefreshCw } from 'lucide-react';

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounting/chart-of-accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

  return (
    <AppLayout
      title="Chart of Accounts"
      subtitle="Standardized general ledger account classifications and real-time ledger balances"
      actions={
        <button className="btn btn-secondary" onClick={loadAccounts}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {types.map((type) => {
          const typeAccounts = accounts.filter(a => a.type === type);
          if (typeAccounts.length === 0) return null;

          return (
            <div key={type} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                backgroundColor: 'var(--color-dark-navy)',
                color: '#FFFFFF',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                {type} ACCOUNTS
              </div>

              <table className="enterprise-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Code</th>
                    <th style={{ width: '35%' }}>Account Name</th>
                    <th style={{ width: '25%' }}>Subtype</th>
                    <th style={{ width: '25%', textAlign: 'right' }}>Current Balance (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {typeAccounts.map((a) => (
                    <tr key={a._id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{a.code}</td>
                      <td style={{ fontWeight: 500 }}>
                        {a.name}
                        {a.isSystemAccount && (
                          <span style={{ marginLeft: '8px', fontSize: '10px', color: '#64748B', backgroundColor: '#F1F5F9', padding: '1px 5px', borderRadius: '3px' }}>
                            SYSTEM
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748B' }}>{a.subType}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-dark-navy)' }}>
                        ₹ {parseFloat(a.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
