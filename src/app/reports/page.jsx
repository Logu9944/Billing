'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { BarChart3, RefreshCw, CheckCircle2, AlertCircle, Printer } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pnl'); // 'pnl', 'balance-sheet', 'ar-aging'

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports');
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
    loadReports();
  }, []);

  const baseCurr = data?.baseCurrency || 'INR';
  const pnl = data?.profitAndLoss;
  const bs = data?.balanceSheet;
  const aging = data?.arAging;

  return (
    <AppLayout
      title="Financial Reports"
      subtitle="Comprehensive Profit & Loss statements, Balance Sheet, and Accounts Receivable aging schedules"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={14} />
            <span>Print Report</span>
          </button>
          <button className="btn btn-secondary" onClick={loadReports}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: '2px'
      }}>
        <button
          className={`btn ${activeTab === 'pnl' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('pnl')}
        >
          Profit & Loss Statement (Income Statement)
        </button>
        <button
          className={`btn ${activeTab === 'balance-sheet' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('balance-sheet')}
        >
          Balance Sheet (Financial Position)
        </button>
        <button
          className={`btn ${activeTab === 'ar-aging' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('ar-aging')}
        >
          A/R Aging Schedule
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>Loading financial data...</div>
      ) : !data ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
          No financial reports generated yet.
        </div>
      ) : activeTab === 'pnl' ? (
        /* Profit & Loss */
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid var(--color-dark-navy)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>STATEMENT OF PROFIT & LOSS</h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Base Accounting Currency: {baseCurr} | Prepared in accordance with Double-Entry Standards
            </div>
          </div>

          <table className="enterprise-table" style={{ border: 'none' }}>
            <tbody>
              {/* Revenue */}
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <td style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-dark-navy)' }}>OPERATING REVENUE</td>
                <td></td>
              </tr>
              <tr>
                <td style={{ paddingLeft: '24px' }}>Sales Revenue (Goods & Services)</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(pnl?.salesRevenue || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: '24px' }}>Realized Foreign Exchange Gains</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>+ ₹ {parseFloat(pnl?.exchangeGain || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ fontWeight: 700 }}>TOTAL REVENUE (A)</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: 'var(--color-deep-blue)' }}>
                  ₹ {parseFloat(pnl?.totalRevenue || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* COGS */}
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <td style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-dark-navy)', paddingTop: '16px' }}>COST OF SALES</td>
                <td></td>
              </tr>
              <tr>
                <td style={{ paddingLeft: '24px' }}>Cost of Goods Sold (COGS)</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(pnl?.cogs || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ fontWeight: 700 }}>GROSS PROFIT (A - B)</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                  ₹ {parseFloat(pnl?.grossProfit || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Operating Expenses */}
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                <td style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-dark-navy)', paddingTop: '16px' }}>OPERATING & FINANCIAL EXPENSES</td>
                <td></td>
              </tr>
              <tr>
                <td style={{ paddingLeft: '24px' }}>General & Administrative Operating Expenses</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(pnl?.operatingExpense || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style={{ paddingLeft: '24px' }}>Realized Foreign Exchange Losses</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-danger)' }}>- ₹ {parseFloat(pnl?.exchangeLoss || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ borderTop: '1px solid var(--color-border)', borderBottom: '2px solid var(--color-dark-navy)' }}>
                <td style={{ fontWeight: 700 }}>TOTAL EXPENSES (C)</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px' }}>
                  ₹ {parseFloat(pnl?.totalExpenses || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Net Profit */}
              <tr style={{ backgroundColor: '#EFF6FF', borderBottom: '2px solid var(--color-dark-navy)' }}>
                <td style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-dark-navy)' }}>NET PROFIT / (LOSS) FOR THE PERIOD</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '16px', color: parseFloat(pnl?.netProfit || '0') >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  ₹ {parseFloat(pnl?.netProfit || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : activeTab === 'balance-sheet' ? (
        /* Balance Sheet */
        <div className="card" style={{ maxWidth: '860px', margin: '0 auto', padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid var(--color-dark-navy)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>BALANCE SHEET</h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Base Currency: {baseCurr} | Double-Entry Balancing Verification
            </div>
            {bs?.isBalanced && (
              <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontSize: '12px', fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                <span>Accounting Equilibrium Verified: Assets = Liabilities + Equity</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Assets */}
            <div>
              <div style={{ backgroundColor: '#F8FAFC', padding: '8px 12px', fontWeight: 700, borderBottom: '2px solid var(--color-deep-blue)' }}>
                ASSETS
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Cash & Bank Balances:</span>
                <span style={{ fontWeight: 600 }}>₹ {parseFloat(bs?.assets?.bankCash || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Accounts Receivable (Debtors):</span>
                <span style={{ fontWeight: 600 }}>₹ {parseFloat(bs?.assets?.accountsReceivable || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Inventory Valuation (Asset):</span>
                <span style={{ fontWeight: 600 }}>₹ {parseFloat(bs?.assets?.inventoryAsset || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '10px 0', borderTop: '2px solid var(--color-dark-navy)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', color: 'var(--color-dark-navy)' }}>
                <span>TOTAL ASSETS:</span>
                <span>₹ {parseFloat(bs?.assets?.totalAssets || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div>
              <div style={{ backgroundColor: '#F8FAFC', padding: '8px 12px', fontWeight: 700, borderBottom: '2px solid var(--color-deep-blue)' }}>
                LIABILITIES & EQUITY
              </div>
              <div style={{ padding: '6px 0', fontWeight: 600, fontSize: '12px', color: '#64748B' }}>Current Liabilities:</div>
              <div style={{ padding: '6px 0 6px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Accounts Payable (Creditors):</span>
                <span>₹ {parseFloat(bs?.liabilities?.accountsPayable || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '6px 0 6px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Tax / GST Payable:</span>
                <span>₹ {parseFloat(bs?.liabilities?.taxPayable || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                <span>Total Liabilities:</span>
                <span>₹ {parseFloat(bs?.liabilities?.totalLiabilities || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ padding: '6px 0', fontWeight: 600, fontSize: '12px', color: '#64748B', marginTop: '10px' }}>Owner's Equity:</div>
              <div style={{ padding: '6px 0 6px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Retained Earnings / Capital:</span>
                <span>₹ {parseFloat(bs?.equity?.retainedEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '6px 0 6px 12px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Current Period Earnings (P&L):</span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>₹ {parseFloat(bs?.equity?.currentPeriodEarnings || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px' }}>
                <span>Total Equity:</span>
                <span>₹ {parseFloat(bs?.equity?.totalEquity || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div style={{ padding: '10px 0', borderTop: '2px solid var(--color-dark-navy)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px', color: 'var(--color-dark-navy)' }}>
                <span>TOTAL LIABILITIES & EQUITY:</span>
                <span>₹ {parseFloat(bs?.totalLiabilitiesAndEquity || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* AR Aging Schedule */
        <div className="card" style={{ maxWidth: '860px', margin: '0 auto', padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid var(--color-dark-navy)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>ACCOUNTS RECEIVABLE AGING SCHEDULE</h2>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Base Currency: {baseCurr} | Overdue analysis grouped by aging buckets
            </div>
          </div>

          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Aging Category</th>
                <th>Days Past Due</th>
                <th style={{ textAlign: 'right' }}>Outstanding Amount (INR)</th>
                <th style={{ textAlign: 'right' }}>% of Total Receivables</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>Current (Not Overdue)</td>
                <td>Within payment terms</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(aging?.current || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>
                  {parseFloat(aging?.total || '0') > 0 ? `${((parseFloat(aging?.current || '0') / parseFloat(aging?.total)) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--color-warning)' }}>1 - 30 Days Past Due</td>
                <td>1 to 30 days overdue</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(aging?.days30 || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>
                  {parseFloat(aging?.total || '0') > 0 ? `${((parseFloat(aging?.days30 || '0') / parseFloat(aging?.total)) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: '#EA580C' }}>31 - 60 Days Past Due</td>
                <td>31 to 60 days overdue</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(aging?.days60 || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>
                  {parseFloat(aging?.total || '0') > 0 ? `${((parseFloat(aging?.days60 || '0') / parseFloat(aging?.total)) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600, color: 'var(--color-danger)' }}>90+ Days Past Due</td>
                <td>Critical aging overdue</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>₹ {parseFloat(aging?.days90Plus || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>
                  {parseFloat(aging?.total || '0') > 0 ? `${((parseFloat(aging?.days90Plus || '0') / parseFloat(aging?.total)) * 100).toFixed(1)}%` : '0%'}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#F8FAFC', borderTop: '2px solid var(--color-dark-navy)' }}>
                <td colSpan="2" style={{ fontWeight: 700, fontSize: '14px' }}>TOTAL RECEIVABLES</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: 'var(--color-deep-blue)' }}>
                  ₹ {parseFloat(aging?.total || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
