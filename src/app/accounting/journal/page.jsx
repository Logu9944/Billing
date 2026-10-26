'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { ScrollText, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadJournal = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounting/journal');
      const data = await res.json();
      if (data.success) {
        setEntries(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournal();
  }, []);

  return (
    <AppLayout
      title="Journal Entries"
      subtitle="Complete chronological audit record of all balanced double-entry accounting transactions"
      actions={
        <button className="btn btn-secondary" onClick={loadJournal}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Loading journal records...</div>
        ) : entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
            No journal entries recorded. Transactions will appear here automatically when invoices, bills, or payments are processed.
          </div>
        ) : (
          entries.map((je) => (
            <div key={je._id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Journal Header */}
              <div style={{
                backgroundColor: '#F8FAFC',
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-dark-navy)' }}>
                    {je.entryNumber}
                  </span>
                  <span className="badge badge-issued">{je.referenceType}</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Date: {new Date(je.date).toLocaleDateString('en-GB')}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>
                    {je.memo}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {je.status === 'POSTED' ? (
                    <span className="badge badge-paid">POSTED & BALANCED</span>
                  ) : (
                    <span className="badge badge-void">{je.status}</span>
                  )}
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-dark-navy)' }}>
                    Total: ₹{parseFloat(je.totalDebit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Journal Lines */}
              <table className="enterprise-table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: '#FFFFFF' }}>
                    <th style={{ width: '15%' }}>Account Code</th>
                    <th style={{ width: '25%' }}>Account Name</th>
                    <th style={{ width: '30%' }}>Description</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Debit (INR)</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Credit (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {(je.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{l.accountCode}</td>
                      <td style={{ fontWeight: 500 }}>{l.accountName}</td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        {l.description}
                        {l.foreignCurrency && l.foreignCurrency !== 'INR' && (
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: '#1D4ED8', background: '#EFF6FF', padding: '1px 5px', borderRadius: '3px' }}>
                            {l.foreignCurrency} {l.foreignDebit || l.foreignCredit} @ {l.exchangeRate}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: parseFloat(l.debit) > 0 ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                        {parseFloat(l.debit) > 0 ? `₹${parseFloat(l.debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: parseFloat(l.credit) > 0 ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                        {parseFloat(l.credit) > 0 ? `₹${parseFloat(l.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
