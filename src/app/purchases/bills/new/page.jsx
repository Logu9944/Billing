'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, CheckCircle2, Plus, Trash2, Coins } from 'lucide-react';
import Link from 'next/link';

export default function NewBillPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [supplierId, setSupplierId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState('INR');
  const [exchangeRate, setExchangeRate] = useState('1.00');
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState([
    {
      description: 'Office Cloud Server Hosting & Infrastructure',
      quantity: 1,
      unitPrice: 15000,
      taxPercent: 18
    }
  ]);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/suppliers');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setSuppliers(data.data);
          setSupplierId(data.data[0]._id);
          setCurrency(data.data[0].currency || 'INR');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleSupplierChange = (id) => {
    setSupplierId(id);
    const supp = suppliers.find(s => s._id === id);
    if (supp) {
      setCurrency(supp.currency || 'INR');
      setExchangeRate(supp.currency === 'USD' ? '85.50' : '1.00');
    }
  };

  const updateLine = (idx, field, value) => {
    const newLines = [...lines];
    newLines[idx][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { description: '', quantity: 1, unitPrice: 0, taxPercent: 18 }]);
  };

  const removeLine = (idx) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    const rate = parseFloat(exchangeRate) || 1;

    lines.forEach(l => {
      const net = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0);
      const tax = net * ((parseFloat(l.taxPercent) || 0) / 100);
      subtotal += net;
      taxTotal += tax;
    });

    const total = subtotal + taxTotal;
    const baseTotal = total * rate;

    return {
      subtotal: subtotal.toFixed(2),
      taxTotal: taxTotal.toFixed(2),
      total: total.toFixed(2),
      baseTotal: baseTotal.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!supplierId) throw new Error('Please select a supplier');
      if (!billNumber) throw new Error('Vendor invoice number is required');

      const payload = {
        supplierId,
        billNumber,
        billDate,
        dueDate,
        currency,
        exchangeRate: parseFloat(exchangeRate) || 1,
        status: 'ISSUED',
        notes,
        lines: lines.map(l => ({
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          taxPercent: parseFloat(l.taxPercent) || 0
        }))
      };

      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record bill');
      }

      router.push('/purchases/bills');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Record Supplier Bill"
      subtitle="Enter incoming vendor invoice, calculate input GST/tax, and post to Accounts Payable"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/purchases/bills" className="btn btn-secondary">
            <ArrowLeft size={14} />
            <span>Cancel</span>
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={handleSubmit}
          >
            <CheckCircle2 size={14} />
            <span>{submitting ? 'Recording...' : 'Record & Post Bill'}</span>
          </button>
        </div>
      }
    >
      {error && (
        <div style={{
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-input)',
          marginBottom: '16px',
          fontSize: '13px',
          border: '1px solid var(--color-danger-border)'
        }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Vendor / Supplier *</label>
            <select
              className="form-select"
              value={supplierId}
              onChange={(e) => handleSupplierChange(e.target.value)}
            >
              {suppliers.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Vendor Invoice # *</label>
            <input
              type="text"
              required
              className="form-input"
              value={billNumber}
              onChange={(e) => setBillNumber(e.target.value)}
              placeholder="e.g. INV-DELL-88392"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Bill Date</label>
            <input
              type="date"
              className="form-input"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#F8FAFC',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-input)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
            <Coins size={16} color="var(--color-deep-blue)" />
            <span>Currency:</span>
          </div>

          <select
            className="form-select"
            style={{ width: '90px', padding: '4px 8px' }}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>

          <span style={{ fontSize: '13px' }}>Rate (to INR):</span>
          <input
            type="number"
            step="0.0001"
            className="form-input"
            style={{ width: '100px', padding: '4px 8px' }}
            value={exchangeRate}
            onChange={(e) => setExchangeRate(e.target.value)}
          />
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Expense / Item Details</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
            <Plus size={12} />
            <span>Add Row</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Expense Description</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Qty</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Cost / Price ({currency})</th>
                <th style={{ width: '10%', textAlign: 'right' }}>GST %</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Total ({currency})</th>
                <th style={{ width: '4%' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const net = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                const total = net + (net * ((parseFloat(line.taxPercent) || 0) / 100));

                return (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Description of item / expense"
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        style={{ textAlign: 'right' }}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="form-input"
                        style={{ textAlign: 'right' }}
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-input"
                        style={{ textAlign: 'right' }}
                        value={line.taxPercent}
                        onChange={(e) => updateLine(idx, 'taxPercent', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {total.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Bill Notes & Reference</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>{currency} {totals.subtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
            <span>Input Tax / GST:</span>
            <span>{currency} {totals.taxTotal}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: '2px solid var(--color-dark-navy)',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-dark-navy)'
          }}>
            <span>Total Payable:</span>
            <span style={{ color: 'var(--color-deep-blue)' }}>{currency} {totals.total}</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
