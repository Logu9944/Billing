'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeftRight, RefreshCw, Plus } from 'lucide-react';
import Link from 'next/link';

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inventory/movements');
      const data = await res.json();
      if (data.success) {
        setMovements(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  return (
    <AppLayout
      title="Stock Movements History"
      subtitle="Complete chronological audit trail of all inventory receipts, sale deductions, and adjustments"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={loadMovements}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link href="/inventory/adjustments" className="btn btn-primary">
            <Plus size={14} />
            <span>New Stock Adjustment</span>
          </Link>
        </div>
      }
    >
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product Name</th>
              <th>SKU</th>
              <th>Movement Type</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
              <th style={{ textAlign: 'right' }}>Unit Cost (INR)</th>
              <th style={{ textAlign: 'right' }}>Total Valuation (INR)</th>
              <th>Reference / Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading stock movements...</td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              movements.map((m) => {
                const isOut = m.movementType === 'SALE_DEDUCTION' || m.movementType === 'ADJUSTMENT_OUT';
                return (
                  <tr key={m._id}>
                    <td>{new Date(m.date).toLocaleDateString('en-GB')}</td>
                    <td style={{ fontWeight: 600 }}>{m.productId?.name || 'Item'}</td>
                    <td style={{ color: 'var(--color-deep-blue)', fontWeight: 600 }}>{m.productId?.sku}</td>
                    <td>
                      <span className={`badge ${isOut ? 'badge-void' : 'badge-paid'}`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td style={{
                      textAlign: 'right',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: isOut ? 'var(--color-danger)' : 'var(--color-success)'
                    }}>
                      {isOut ? `-${m.quantity}` : `+${m.quantity}`} {m.productId?.unit || 'pcs'}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(m.unitCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(m.totalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748B' }}>
                      {m.referenceNumber ? `[${m.referenceNumber}] ` : ''}{m.notes}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
