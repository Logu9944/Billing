'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Sliders, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function StockAdjustmentsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [productId, setProductId] = useState('');
  const [type, setType] = useState('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('5');
  const [reason, setReason] = useState('Physical inventory reconciliation count');

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data.success) {
          const tracked = data.data.filter(p => p.trackInventory);
          setProducts(tracked);
          if (tracked.length > 0) setProductId(tracked[0]._id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const selectedProduct = products.find(p => p._id === productId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!productId) throw new Error('Please select a product');

      const res = await fetch('/api/inventory/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          type,
          quantity: parseFloat(quantity),
          reason
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust stock');
      }

      router.push('/inventory/movements');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Stock Adjustments"
      subtitle="Reconcile inventory variances, perform stock write-offs, and update inventory asset ledgers"
      actions={
        <Link href="/inventory/movements" className="btn btn-secondary">
          <ArrowLeft size={14} />
          <span>View Movements</span>
        </Link>
      }
    >
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card">
          <div style={{
            backgroundColor: 'var(--color-dark-navy)',
            color: '#FFFFFF',
            padding: '16px 20px',
            margin: '-16px -16px 20px -16px',
            borderRadius: '8px 8px 0 0'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#FFFFFF' }}>Record Stock Adjustment</h2>
            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
              Automatically calculates asset valuation impact and updates double-entry ledger accounts
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              padding: '10px 14px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '13px',
              border: '1px solid var(--color-danger-border)'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Product to Adjust *</label>
              <select
                className="form-select"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {products.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.sku}) — Current Stock: {p.currentStock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '4px',
                border: '1px solid var(--color-border)',
                marginBottom: '16px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>Current Stock on Hand: <strong>{selectedProduct.currentStock} {selectedProduct.unit}</strong></div>
                <div>Standard Unit Cost: <strong>₹{selectedProduct.purchasePrice}</strong></div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Adjustment Type *</label>
                <select
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="ADJUSTMENT_IN">Stock In (+ Increase Stock)</option>
                  <option value="ADJUSTMENT_OUT">Stock Out (- Decrease / Write-Off)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Adjustment Quantity *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Memo *</label>
              <textarea
                className="form-textarea"
                rows="3"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Physical inventory count variance or damaged warehouse goods"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <Link href="/inventory/products" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" disabled={submitting} className="btn btn-primary">
                <CheckCircle2 size={14} />
                <span>{submitting ? 'Processing...' : 'Apply Stock Adjustment'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
