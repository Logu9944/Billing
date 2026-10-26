'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Plus, Trash2, ArrowLeft, Coins, Calculator, CheckCircle2, Barcode } from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import Link from 'next/link';

export default function NewInvoicePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('85.50');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('Payment is requested in USD to our treasury account.');
  const [status, setStatus] = useState('ISSUED');

  const [lines, setLines] = useState([
    {
      productId: '',
      sku: 'SRV-CONS-01',
      name: 'Enterprise Financial Architecture Consulting',
      description: 'Consulting services for Levroun multi-currency system',
      quantity: 1,
      unitPrice: 1000,
      discountPercent: 0,
      taxPercent: 0
    }
  ]);

  useEffect(() => {
    async function init() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products')
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();

        if (cData.success) {
          setCustomers(cData.data);
          if (cData.data.length > 0) {
            setCustomerId(cData.data[0]._id);
            setCurrency(cData.data[0].currency || 'USD');
          }
        }
        if (pData.success) {
          setProducts(pData.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    }
    init();
  }, []);

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const selected = customers.find(c => c._id === id);
    if (selected) {
      setCurrency(selected.currency || 'USD');
      if (selected.currency === 'INR') {
        setExchangeRate('1.00');
      } else if (selected.currency === 'USD') {
        setExchangeRate('85.50');
      } else if (selected.currency === 'EUR') {
        setExchangeRate('92.50');
      } else if (selected.currency === 'GBP') {
        setExchangeRate('108.00');
      }
    }
  };

  const handleProductSelect = (idx, prodId) => {
    const prod = products.find(p => p._id === prodId);
    if (!prod) return;

    const newLines = [...lines];
    newLines[idx] = {
      ...newLines[idx],
      productId: prod._id,
      sku: prod.sku,
      name: prod.name,
      description: prod.description || prod.name,
      unitPrice: parseFloat(prod.sellingPrice) || 0,
      taxPercent: parseFloat(prod.taxRate) || 0
    };
    setLines(newLines);
  };

  const updateLine = (idx, field, value) => {
    const newLines = [...lines];
    newLines[idx][field] = value;
    setLines(newLines);
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        productId: '',
        sku: '',
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxPercent: 0
      }
    ]);
  };

  const removeLine = (idx) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleBarcodeScan = (code) => {
    if (!code) return;
    const cleanCode = code.trim().toLowerCase();
    const match = products.find(p => 
      (p.sku && p.sku.toLowerCase() === cleanCode) || 
      (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
      (p._id === code) ||
      (p.name && p.name.toLowerCase() === cleanCode)
    );

    if (match) {
      const existingIdx = lines.findIndex(l => l.productId === match._id);
      if (existingIdx !== -1) {
        const updated = [...lines];
        updated[existingIdx].quantity = (parseFloat(updated[existingIdx].quantity) || 0) + 1;
        setLines(updated);
      } else {
        const newLine = {
          productId: match._id,
          sku: match.sku,
          name: match.name,
          description: match.description || match.name,
          quantity: 1,
          unitPrice: match.salesPrice || 0,
          discountPercent: 0,
          taxPercent: match.taxRate || 0
        };
        if (lines.length === 1 && !lines[0].productId && !lines[0].name) {
          setLines([newLine]);
        } else {
          setLines([...lines, newLine]);
        }
      }
    } else {
      setLines([
        ...lines,
        {
          productId: '',
          sku: code,
          name: `Item (${code})`,
          description: `Scanned SKU / Code: ${code}`,
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 0
        }
      ]);
    }
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    const rate = parseFloat(exchangeRate) || 1;

    lines.forEach((l) => {
      const qty = parseFloat(l.quantity) || 0;
      const price = parseFloat(l.unitPrice) || 0;
      const disc = parseFloat(l.discountPercent) || 0;
      const tax = parseFloat(l.taxPercent) || 0;

      const gross = qty * price;
      const discount = gross * (disc / 100);
      const net = gross - discount;
      const lineTax = net * (tax / 100);

      subtotal += net;
      taxTotal += lineTax;
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

  const handleSubmit = async (submitStatus) => {
    setSubmitting(true);
    setError('');

    try {
      if (!customerId) throw new Error('Please select a customer');
      if (lines.length === 0) throw new Error('Add at least one line item');

      const payload = {
        customerId,
        issueDate,
        dueDate,
        currency,
        exchangeRate: parseFloat(exchangeRate) || 1,
        status: submitStatus,
        paymentTerms,
        notes,
        lines: lines.map(l => ({
          productId: l.productId || null,
          sku: l.sku || '',
          name: l.name,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unitPrice: parseFloat(l.unitPrice) || 0,
          discountPercent: parseFloat(l.discountPercent) || 0,
          taxPercent: parseFloat(l.taxPercent) || 0
        }))
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      router.push('/sales/invoices');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Create Commercial Invoice"
      subtitle="Draft or finalize tax invoices with multi-currency conversion and immediate ledger posting"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/sales/invoices" className="btn btn-secondary">
            <ArrowLeft size={14} />
            <span>Cancel</span>
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={submitting}
            onClick={() => handleSubmit('ISSUED')}
          >
            <CheckCircle2 size={14} />
            <span>{submitting ? 'Posting...' : 'Issue & Post to Ledger'}</span>
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

      {/* Top Details Card */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Customer *</label>
            <select
              className="form-select"
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Issue Date</label>
            <input
              type="date"
              className="form-input"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
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

          <div className="form-group">
            <label className="form-label">Payment Terms</label>
            <select
              className="form-select"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
            >
              <option value="Net 15">Net 15 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 45">Net 45 Days</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </select>
          </div>
        </div>

        {/* Multi-Currency Architecture Panel */}
        <div style={{
          marginTop: '16px',
          padding: '14px',
          backgroundColor: '#F8FAFC',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-dark-navy)' }}>
              <Coins size={16} color="var(--color-deep-blue)" />
              <span>Currency Architecture:</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="form-label" style={{ margin: 0 }}>Invoice Currency:</span>
              <select
                className="form-select"
                style={{ width: '90px', padding: '4px 8px' }}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="form-label" style={{ margin: 0 }}>Exchange Rate:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '13px' }}>1 {currency} = ₹</span>
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
          </div>

          <div style={{
            fontSize: '12px',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #BFDBFE'
          }}>
            <strong>Internal Ledger:</strong> Records INR ₹{parseFloat(totals.baseTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })} equivalent
          </div>
        </div>
      </div>

      {/* Line Items Card */}
      <div className="card" style={{ marginBottom: '16px', padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Invoice Line Items</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setScannerOpen(true)}
              style={{ color: 'var(--color-deep-blue)', borderColor: 'var(--color-sky-blue)' }}
              id="btn-scan-barcode"
            >
              <Barcode size={13} />
              <span>Scan Barcode / SKU</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
              <Plus size={12} />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Product / Service</th>
                <th style={{ width: '12%' }}>SKU</th>
                <th style={{ width: '24%' }}>Description</th>
                <th style={{ width: '9%', textAlign: 'right' }}>Qty</th>
                <th style={{ width: '11%', textAlign: 'right' }}>Price ({currency})</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Tax %</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Total ({currency})</th>
                <th style={{ width: '4%' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const qty = parseFloat(line.quantity) || 0;
                const price = parseFloat(line.unitPrice) || 0;
                const tax = parseFloat(line.taxPercent) || 0;
                const lineNet = qty * price;
                const lineTotal = lineNet + (lineNet * (tax / 100));

                return (
                  <tr key={idx}>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '4px 6px', fontSize: '12px' }}
                        value={line.productId}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                      >
                        <option value="">-- Custom Item --</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Item name"
                        style={{ marginTop: '4px', padding: '4px 6px', fontSize: '12px' }}
                        value={line.name}
                        onChange={(e) => updateLine(idx, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="SKU"
                        style={{ padding: '4px 6px', fontSize: '12px' }}
                        value={line.sku}
                        onChange={(e) => updateLine(idx, 'sku', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Description..."
                        style={{ padding: '4px 6px', fontSize: '12px' }}
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0.01"
                        step="1"
                        className="form-input"
                        style={{ padding: '4px 6px', textAlign: 'right', fontSize: '12px' }}
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
                        style={{ padding: '4px 6px', textAlign: 'right', fontSize: '12px' }}
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
                        style={{ padding: '4px 6px', textAlign: 'right', fontSize: '12px' }}
                        value={line.taxPercent}
                        onChange={(e) => updateLine(idx, 'taxPercent', e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {lineTotal.toFixed(2)}
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

      {/* Summary Box & Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px' }}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Payment Notes & Bank Instructions</label>
            <textarea
              className="form-textarea"
              rows="4"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="card" style={{ backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
            <span style={{ fontWeight: 600 }}>{currency} {totals.subtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Tax / GST Total:</span>
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
            <span>Total Invoiced:</span>
            <span style={{ color: 'var(--color-deep-blue)' }}>{currency} {totals.total}</span>
          </div>

          <div style={{
            marginTop: '12px',
            padding: '8px 10px',
            backgroundColor: '#F8FAFC',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div style={{ color: 'var(--color-text-secondary)' }}>Accounting Value (Base INR):</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-dark-navy)', marginTop: '2px' }}>
              ₹ {parseFloat(totals.baseTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
              Conversion rate applied: 1 {currency} = ₹{exchangeRate}
            </div>
          </div>
        </div>
      </div>

      <BarcodeScannerModal 
        isOpen={scannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={handleBarcodeScan} 
      />
    </AppLayout>
  );
}
