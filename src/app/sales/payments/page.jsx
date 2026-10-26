'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, CreditCard, RefreshCw, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Payment Form
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('86.00'); // Example rate on payment date
  const [paymentAmount, setPaymentAmount] = useState('1000');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('Client wire remittance via State Bank of India');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [pmtRes, custRes, accRes] = await Promise.all([
        fetch('/api/payments?type=RECEIPT'),
        fetch('/api/customers'),
        fetch('/api/accounting/chart-of-accounts')
      ]);
      const pmtData = await pmtRes.json();
      const custData = await custRes.json();
      const accData = await accRes.json();

      if (pmtData.success) setPayments(pmtData.data);
      if (custData.success) setCustomers(custData.data);
      if (accData.success) {
        const bankAccounts = accData.data.filter(a => a.type === 'ASSET' && (a.subType === 'BANK' || a.subType === 'CASH'));
        setAccounts(bankAccounts);
        if (bankAccounts.length > 0) setDepositAccountId(bankAccounts[0]._id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerSelect = async (custId) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c._id === custId);
    if (cust) {
      setCurrency(cust.currency || 'USD');
      setExchangeRate(cust.currency === 'USD' ? '86.00' : '1.00');
    }

    try {
      // Fetch open invoices for this customer
      const res = await fetch(`/api/invoices?customerId=${custId}&status=ISSUED`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setInvoices(data.data);
        setSelectedInvoiceId(data.data[0]._id);
        setPaymentAmount(data.data[0].outstandingAmount);
      } else {
        setInvoices([]);
        setSelectedInvoiceId('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateGainLossPreview = () => {
    if (!selectedInvoiceId) return null;
    const inv = invoices.find(i => i._id === selectedInvoiceId);
    if (!inv) return null;

    const amt = parseFloat(paymentAmount) || 0;
    const origRate = parseFloat(inv.exchangeRate) || 1;
    const pmtRate = parseFloat(exchangeRate) || 1;

    const origBase = amt * origRate;
    const pmtBase = amt * pmtRate;
    const diff = pmtBase - origBase;

    return {
      origBase: origBase.toFixed(2),
      pmtBase: pmtBase.toFixed(2),
      diff: diff.toFixed(2),
      isGain: diff >= 0
    };
  };

  const preview = calculateGainLossPreview();

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!selectedCustomerId) throw new Error('Please select a customer');
      if (!selectedInvoiceId) throw new Error('Please select an invoice to allocate payment');

      const payload = {
        type: 'RECEIPT',
        partyType: 'CUSTOMER',
        partyId: selectedCustomerId,
        paymentDate,
        paymentMethod,
        depositAccountId,
        paymentCurrency: currency,
        paymentAmount: parseFloat(paymentAmount),
        exchangeRate: parseFloat(exchangeRate),
        reference,
        notes,
        allocations: [
          {
            targetId: selectedInvoiceId,
            amount: parseFloat(paymentAmount)
          }
        ]
      };

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record payment');
      }

      setModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Payments Received"
      subtitle="Record customer remittances, calculate realized exchange differences, and update ledger balances"
      actions={
        <button
          className="btn btn-primary"
          onClick={() => {
            setModalOpen(true);
            if (customers.length > 0) handleCustomerSelect(customers[0]._id);
          }}
        >
          <Plus size={14} />
          <span>Record Customer Payment</span>
        </button>
      }
    >
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Payment Number</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Method</th>
              <th style={{ textAlign: 'right' }}>Payment Amount</th>
              <th style={{ textAlign: 'right' }}>Bank Received (INR)</th>
              <th style={{ textAlign: 'right' }}>Payment Rate</th>
              <th>Reference / Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px' }}>Loading payments...</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No customer payments recorded yet. Click "Record Customer Payment" to receive funds.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{p.paymentNumber}</td>
                  <td style={{ fontWeight: 600 }}>{p.partyName}</td>
                  <td>{new Date(p.paymentDate).toLocaleDateString('en-GB')}</td>
                  <td>
                    <span className="badge badge-draft">{p.paymentMethod}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {p.paymentCurrency} {parseFloat(p.paymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-success)' }}>
                    ₹ {parseFloat(p.basePaymentAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: '#64748B' }}>
                    1 {p.paymentCurrency} = ₹{parseFloat(p.exchangeRate).toFixed(2)}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748B' }}>
                    {p.reference ? `${p.reference} - ` : ''}{p.notes}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-modal)',
            width: '100%',
            maxWidth: '580px',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: 'var(--color-dark-navy)',
              color: '#FFFFFF',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Record Customer Payment (Multi-Currency)</span>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer' }}
              >✕</button>
            </div>

            <form onSubmit={handleRecordPayment} style={{ padding: '20px' }}>
              {error && (
                <div style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '14px',
                  fontSize: '13px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select
                    className="form-select"
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                  >
                    {customers.map(c => (
                      <option key={c._id} value={c._id}>{c.name} ({c.currency})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Allocate To Invoice *</label>
                  <select
                    className="form-select"
                    value={selectedInvoiceId}
                    onChange={(e) => {
                      setSelectedInvoiceId(e.target.value);
                      const inv = invoices.find(i => i._id === e.target.value);
                      if (inv) setPaymentAmount(inv.outstandingAmount);
                    }}
                  >
                    {invoices.length === 0 ? (
                      <option value="">No open invoices</option>
                    ) : (
                      invoices.map(inv => (
                        <option key={inv._id} value={inv._id}>
                          {inv.invoiceNumber} (Due: {inv.currency} {inv.outstandingAmount} @ {inv.exchangeRate})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deposit Account</label>
                  <select
                    className="form-select"
                    value={depositAccountId}
                    onChange={(e) => setDepositAccountId(e.target.value)}
                  >
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Payment Amount ({currency})</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment-Date Rate (INR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                  />
                </div>
              </div>

              {preview && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 'var(--radius-input)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '14px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-dark-navy)', marginBottom: '4px' }}>
                    Multi-Currency Realization Breakdown:
                  </div>
                  <div>• Original Invoiced Value (AR Relief): ₹{preview.origBase}</div>
                  <div>• Bank Deposit Value (Payment Date Rate): ₹{preview.pmtBase}</div>
                  <div style={{
                    marginTop: '4px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: preview.isGain ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {preview.isGain ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{preview.isGain ? 'Realized Exchange Gain:' : 'Realized Exchange Loss:'} ₹{Math.abs(preview.diff)}</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UTR-SBI-9928190"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Processing...' : 'Record Payment & Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
