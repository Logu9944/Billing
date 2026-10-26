'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Receipt, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function ExpensesPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/bills');
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
    loadExpenses();
  }, []);

  return (
    <AppLayout
      title="Expenses & Operating Costs"
      subtitle="Track corporate operating expenses, vendor disbursements, and overhead allocations"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={loadExpenses}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link href="/purchases/bills/new" className="btn btn-primary">
            <Plus size={14} />
            <span>Record New Expense</span>
          </Link>
        </div>
      }
    >
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Expense Reference</th>
              <th>Vendor / Payee</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Base (INR)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>Loading expenses...</td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No corporate expenses recorded yet. Click "Record New Expense" to log costs.
                </td>
              </tr>
            ) : (
              bills.map((b) => (
                <tr key={b._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{b.internalBillNumber}</td>
                  <td style={{ fontWeight: 600 }}>{b.supplierSnapshot?.name}</td>
                  <td>{new Date(b.billDate).toLocaleDateString('en-GB')}</td>
                  <td>
                    <span className="badge badge-issued">{b.status}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {b.currency} {parseFloat(b.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-dark-navy)' }}>
                    ₹ {parseFloat(b.baseTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>{b.notes || b.billNumber}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
