'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { BookOpen, RefreshCw, Filter, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function LedgersPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounting/ledgers');
      const data = await res.json();
      if (data.success && data.data.accounts) {
        setAccounts(data.data.accounts);
        if (data.data.accounts.length > 0) {
          const defaultAcc = data.data.accounts.find(a => a.code === '1100') || data.data.accounts[0];
          setSelectedAccountId(defaultAcc._id);
          loadLedger(defaultAcc._id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async (accId) => {
    if (!accId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/accounting/ledgers?accountId=${accId}`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data.data);
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

  const handleAccountChange = (id) => {
    setSelectedAccountId(id);
    loadLedger(id);
  };

  const selectedAccount = ledgerData?.account;

  return (
    <AppLayout
      title="General Ledgers"
      subtitle="View chronological debit/credit postings, multi-currency ledger conversions, and running balances"
      actions={
        <button className="btn btn-secondary" onClick={() => loadLedger(selectedAccountId)}>
          <RefreshCw size={14} />
          <span>Refresh Ledger</span>
        </button>
      }
    >
      {/* Account Selector Card */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="form-label" style={{ margin: 0 }}>Select Ledger Account:</span>
            <select
              className="form-select"
              style={{ width: '380px' }}
              value={selectedAccountId}
              onChange={(e) => handleAccountChange(e.target.value)}
            >
              {accounts.map(a => (
                <option key={a._id} value={a._id}>
                  {a.code} — {a.name} ({a.type}) [₹{parseFloat(a.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}]
                </option>
              ))}
            </select>
          </div>

          {selectedAccount && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                Account Classification: <strong style={{ color: 'var(--color-dark-navy)' }}>{selectedAccount.type} / {selectedAccount.subType}</strong>
              </div>
              <div style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1D4ED8'
              }}>
                Current Ledger Balance: ₹ {parseFloat(selectedAccount.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Journal Entry #</th>
              <th>Type</th>
              <th>Transaction Memo / Details</th>
              <th>Foreign Currency Info</th>
              <th style={{ textAlign: 'right' }}>Debit (INR)</th>
              <th style={{ textAlign: 'right' }}>Credit (INR)</th>
              <th style={{ textAlign: 'right' }}>Running Balance (INR)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading ledger entries...</td>
              </tr>
            ) : !ledgerData || ledgerData.lines.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No transactions recorded in this ledger account yet.
                </td>
              </tr>
            ) : (
              ledgerData.lines.map((line, idx) => (
                <tr key={idx}>
                  <td>{new Date(line.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{line.entryNumber}</td>
                  <td>
                    <span className="badge badge-draft">{line.referenceType}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{line.memo}</div>
                    {line.description && line.description !== line.memo && (
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{line.description}</div>
                    )}
                  </td>
                  <td>
                    {line.foreignCurrency && line.foreignCurrency !== 'INR' ? (
                      <div style={{ fontSize: '11px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 6px', borderRadius: '3px', display: 'inline-block' }}>
                        {line.foreignCurrency} {line.foreignDebit || line.foreignCredit} @ {line.exchangeRate}
                      </div>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: parseFloat(line.debit) > 0 ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(line.debit) > 0 ? `₹${parseFloat(line.debit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: parseFloat(line.credit) > 0 ? 600 : 400, fontVariantNumeric: 'tabular-nums' }}>
                    {parseFloat(line.credit) > 0 ? `₹${parseFloat(line.credit).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-dark-navy)' }}>
                    ₹{parseFloat(line.runningBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
