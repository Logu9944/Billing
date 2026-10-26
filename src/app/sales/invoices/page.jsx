'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, FileText, Download, Ban, Eye, RefreshCw, CheckCircle2, Clock, Printer } from 'lucide-react';

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadInvoices = async () => {
    try {
      setLoading(true);
      let url = `/api/invoices?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search, statusFilter]);

  const handleVoid = async (id, invoiceNumber) => {
    if (!confirm(`Are you sure you want to VOID invoice ${invoiceNumber}? This will reverse all double-entry accounting records.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'VOID' })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to void invoice');
        return;
      }
      loadInvoices();
    } catch (e) {
      alert(e.message);
    }
  };

  const getStatusBadge = (inv) => {
    const isOverdue = inv.status !== 'PAID' && inv.status !== 'VOID' && new Date(inv.dueDate) < new Date();

    if (inv.status === 'VOID') return <span className="badge badge-void">VOID</span>;
    if (inv.status === 'PAID') return <span className="badge badge-paid">PAID</span>;
    if (inv.status === 'PARTIALLY_PAID') return <span className="badge badge-partial">PARTIAL</span>;
    if (isOverdue) return <span className="badge badge-void">OVERDUE</span>;
    if (inv.status === 'ISSUED') return <span className="badge badge-issued">ISSUED</span>;
    return <span className="badge badge-draft">DRAFT</span>;
  };

  return (
    <AppLayout
      title="Sales Invoices"
      subtitle="Issue, track, and export commercial multi-currency invoices with automatic ledger integration"
      actions={
        <Link href="/sales/invoices/new" className="btn btn-primary">
          <Plus size={14} />
          <span>Create Invoice</span>
        </Link>
      }
    >
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
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
            placeholder="Search invoice # or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '160px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Issued</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PAID">Paid</option>
          <option value="VOID">Void</option>
        </select>

        <button className="btn btn-secondary" onClick={loadInvoices} title="Refresh list">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Document Amount</th>
              <th style={{ textAlign: 'right' }}>Base Amount (INR)</th>
              <th style={{ textAlign: 'right' }}>Balance Due</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                  No invoices found. Click "Create Invoice" to issue a new commercial bill.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} />
                      <span>{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inv.customerSnapshot?.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{inv.currency} Account</div>
                  </td>
                  <td>{new Date(inv.issueDate).toLocaleDateString('en-GB')}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString('en-GB')}</td>
                  <td>{getStatusBadge(inv)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {inv.currency} {parseFloat(inv.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                    {inv.baseCurrency} {parseFloat(inv.baseTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    <div style={{ fontSize: '10px' }}>@ {parseFloat(inv.exchangeRate).toFixed(2)}</div>
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: parseFloat(inv.outstandingAmount) > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                  }}>
                    {inv.currency} {parseFloat(inv.outstandingAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <Link
                        href={`/sales/invoices/${inv._id}/receipt`}
                        target="_blank"
                        className="btn btn-secondary btn-sm"
                        style={{ borderColor: '#38BDF8', color: '#0369A1' }}
                        title="POS 80mm/58mm Thermal Receipt"
                      >
                        <Printer size={12} />
                        <span>Slip</span>
                      </Link>

                      <a
                        href={`/api/invoices/${inv._id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                        title="Download / Print Vector PDF"
                      >
                        <Download size={12} />
                        <span>PDF</span>
                      </a>

                      {inv.status !== 'VOID' && parseFloat(inv.paidAmount) === 0 && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          title="Void Invoice"
                          onClick={() => handleVoid(inv._id, inv.invoiceNumber)}
                        >
                          <Ban size={12} />
                        </button>
                      )}
                    </div>
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
