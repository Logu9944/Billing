'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, ShoppingBag, RefreshCw } from 'lucide-react';

export default function SupplierBillsPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadBills = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bills?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setBills(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, [search]);

  return (
    <AppLayout
      title="Supplier Bills"
      subtitle="Track vendor bills, input tax credits, and accounts payable obligations"
      actions={
        <Link href="/purchases/bills/new" className="btn btn-primary">
          <Plus size={14} />
          <span>Record Supplier Bill</span>
        </Link>
      }
    >
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-input)',
          padding: '6px 12px',
          width: '320px'
        }}>
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search vendor bill #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
          />
        </div>

        <button className="btn btn-secondary" onClick={loadBills} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Internal Bill #</th>
              <th>Vendor Bill Ref</th>
              <th>Supplier</th>
              <th>Bill Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Bill Amount</th>
              <th style={{ textAlign: 'right' }}>Base Amount (INR)</th>
              <th style={{ textAlign: 'right' }}>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>
                  Loading bills...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                  No supplier bills recorded. Click "Record Supplier Bill" to enter an incoming invoice.
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{b.internalBillNumber}</td>
                  <td style={{ fontWeight: 500 }}>{b.billNumber}</td>
                  <td>{b.supplierSnapshot?.name}</td>
                  <td>{new Date(b.billDate).toLocaleDateString('en-GB')}</td>
                  <td>{new Date(b.dueDate).toLocaleDateString('en-GB')}</td>
                  <td>
                    <span className="badge badge-issued">{b.status}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {b.currency} {parseFloat(b.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                    {b.baseCurrency} {parseFloat(b.baseTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: parseFloat(b.outstandingAmount) > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                  }}>
                    {b.currency} {parseFloat(b.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
