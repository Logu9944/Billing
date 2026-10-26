'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { 
  FileText, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Coins, 
  Package, 
  ArrowUpRight, 
  Plus, 
  ShoppingBag, 
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const baseCurr = data?.baseCurrency || 'INR';

  return (
    <AppLayout
      title="Financial & Operational Dashboard"
      subtitle="Executive business overview, live receivables, multi-currency exposure, and ledger activity"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={loadDashboard}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <Link href="/sales/invoices/new" className="btn btn-primary">
            <Plus size={14} />
            <span>New Invoice</span>
          </Link>
        </div>
      }
    >
      {/* Quick Action Strip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        padding: '10px 16px',
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
          Quick Actions:
        </span>
        <Link href="/sales/invoices/new" className="btn btn-secondary btn-sm">
          <FileText size={12} />
          <span>Create Invoice</span>
        </Link>
        <Link href="/sales/payments" className="btn btn-secondary btn-sm">
          <CreditCard size={12} />
          <span>Record Payment</span>
        </Link>
        <Link href="/inventory/products" className="btn btn-secondary btn-sm">
          <Package size={12} />
          <span>Add Product</span>
        </Link>
        <Link href="/purchases/bills/new" className="btn btn-secondary btn-sm">
          <ShoppingBag size={12} />
          <span>Record Vendor Bill</span>
        </Link>
        <Link href="/accounting/ledgers" className="btn btn-secondary btn-sm">
          <TrendingUp size={12} />
          <span>Audit Ledgers</span>
        </Link>
      </div>

      {/* Top 4 KPI Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="form-label" style={{ margin: 0 }}>Total Invoiced ({baseCurr})</span>
            <FileText size={16} color="var(--color-deep-blue)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-dark-navy)', marginTop: '8px' }}>
            ₹ {parseFloat(data?.totalInvoiced || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            All active commercial invoices
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="form-label" style={{ margin: 0 }}>Payments Received</span>
            <CreditCard size={16} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-success)', marginTop: '8px' }}>
            ₹ {parseFloat(data?.paymentsReceived || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Settled via bank remittance
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="form-label" style={{ margin: 0 }}>Outstanding Receivables</span>
            <TrendingUp size={16} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-dark-navy)', marginTop: '8px' }}>
            ₹ {parseFloat(data?.outstandingReceivables || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Balance due from debtors
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="form-label" style={{ margin: 0 }}>Overdue Invoices</span>
            <AlertTriangle size={16} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-danger)', marginTop: '8px' }}>
            {data?.overdueCount || 0} Bills
          </div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
            Total Overdue: ₹ {parseFloat(data?.overdueAmount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Middle Row: Revenue Trend Chart & Multi-Currency Exposure */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-dark-navy)' }}>
              Revenue Performance Trend ({baseCurr})
            </span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>Accounting Base Currency</span>
          </div>

          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueTrend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip 
                  formatter={(val) => [`₹ ${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#102A43', color: '#FFFFFF', borderRadius: '4px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#173B63" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-dark-navy)' }}>
              Currency Exposure Overview
            </span>
            <Coins size={16} color="var(--color-sky-blue)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(data?.currencyOverview || []).length === 0 ? (
              <div style={{ fontSize: '13px', color: '#64748B', textAlign: 'center', padding: '20px' }}>
                No multi-currency billing recorded yet.
              </div>
            ) : (
              data.currencyOverview.map((c) => (
                <div key={c.currency} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)'
                }}>
                  <div>
                    <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                      {c.currency}
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#64748B' }}>
                      {c.count} {c.count === 1 ? 'Invoice' : 'Invoices'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>
                    {c.currency} {parseFloat(c.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <Link href="/accounting/chart-of-accounts" style={{ fontSize: '12px', color: 'var(--color-deep-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>View Chart of Accounts Balances</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Transactions Table & Inventory Low Stock Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Recent Commercial Transactions</span>
            <Link href="/sales/invoices" style={{ fontSize: '12px', color: 'var(--color-deep-blue)', fontWeight: 500 }}>
              View All Invoices
            </Link>
          </div>

          <table className="enterprise-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Document Amount</th>
                <th style={{ textAlign: 'right' }}>Base (INR)</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentTransactions || []).length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                    No recent transactions.
                  </td>
                </tr>
              ) : (
                data.recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{tx.number}</td>
                    <td>{tx.party}</td>
                    <td>{new Date(tx.date).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className={`badge ${tx.status === 'PAID' ? 'badge-paid' : tx.status === 'ISSUED' ? 'badge-issued' : 'badge-draft'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {tx.currency} {parseFloat(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(tx.baseAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Inventory Alerts</span>
            <AlertTriangle size={16} color="var(--color-warning)" />
          </div>

          {(data?.inventoryAlerts || []).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
              All tracked products are at healthy stock levels.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.inventoryAlerts.map((item) => (
                <div key={item.id} style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-danger-bg)',
                  border: '1px solid var(--color-danger-border)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-danger)' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>SKU: {item.sku} | Threshold: {item.reorderLevel} {item.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>
                    {item.currentStock} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
            <Link href="/inventory/products" style={{ fontSize: '12px', color: 'var(--color-deep-blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Manage Inventory Stock</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
