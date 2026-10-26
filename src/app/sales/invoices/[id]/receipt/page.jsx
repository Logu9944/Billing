'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, CheckCircle2, QrCode } from 'lucide-react';

export default function ThermalReceiptPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paperWidth, setPaperWidth] = useState('80mm'); // '80mm' or '58mm'

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${id}`);
        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Failed to load invoice');
        }
        setInvoice(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'monospace' }}>
        <p>Loading Thermal POS Slip...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#E11D48' }}>Receipt Error</h2>
        <p>{error || 'Invoice not found'}</p>
        <button onClick={() => router.push('/sales/invoices')} style={{ padding: '8px 16px', marginTop: '16px' }}>
          Back to Invoices
        </button>
      </div>
    );
  }

  const org = invoice.organization || {};
  const is58mm = paperWidth === '58mm';
  const widthPx = is58mm ? '220px' : '300px';

  return (
    <>
      {/* Non-printable Screen Controls */}
      <div className="no-print" style={{
        backgroundColor: '#102A43',
        color: '#FFFFFF',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/sales/invoices')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>
            POS Thermal Slip — Invoice #{invoice.invoiceNumber}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', padding: '2px' }}>
            <button
              onClick={() => setPaperWidth('80mm')}
              style={{
                background: !is58mm ? '#38BDF8' : 'transparent',
                color: !is58mm ? '#102A43' : '#FFFFFF',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '3px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              80mm (Standard POS)
            </button>
            <button
              onClick={() => setPaperWidth('58mm')}
              style={{
                background: is58mm ? '#38BDF8' : 'transparent',
                color: is58mm ? '#102A43' : '#FFFFFF',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '3px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              58mm (Mobile POS)
            </button>
          </div>

          <button
            onClick={handlePrint}
            style={{
              backgroundColor: '#F4C542',
              color: '#102A43',
              border: 'none',
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px'
            }}
          >
            <Printer size={15} /> Print Receipt
          </button>
        </div>
      </div>

      {/* Outer Preview Canvas */}
      <div style={{
        backgroundColor: '#F1F5F9',
        minHeight: 'calc(100vh - 54px)',
        padding: '30px 10px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        {/* Printable Thermal Receipt Paper */}
        <div id="receipt-area" style={{
          width: widthPx,
          backgroundColor: '#FFFFFF',
          padding: is58mm ? '12px 8px' : '18px 14px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          fontFamily: '"Courier New", Courier, monospace, monospace',
          color: '#000000',
          fontSize: is58mm ? '11px' : '12px',
          lineHeight: '1.35',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: is58mm ? '14px' : '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {org.name || 'LEVROUN ERP'}
            </div>
            {org.address?.street && <div style={{ fontSize: '10px' }}>{org.address.street}</div>}
            {(org.address?.city || org.address?.state) && (
              <div style={{ fontSize: '10px' }}>
                {[org.address?.city, org.address?.state, org.address?.postalCode].filter(Boolean).join(', ')}
              </div>
            )}
            {org.taxId && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                GSTIN/VAT: {org.taxId}
              </div>
            )}
            {org.phone && <div style={{ fontSize: '10px' }}>Tel: {org.phone}</div>}
          </div>

          <div style={{ textAlign: 'center', margin: '4px 0', borderTop: '1px dashed #000000' }} />

          {/* Receipt Info */}
          <div style={{ fontSize: '10px', margin: '4px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>RCVD/TAX INVOICE:</span>
              <span style={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>DATE/TIME:</span>
              <span>{new Date(invoice.issueDate).toLocaleDateString('en-GB')} {new Date(invoice.createdAt || invoice.issueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>STATUS:</span>
              <span style={{ fontWeight: 'bold' }}>{invoice.status}</span>
            </div>
            {invoice.customerSnapshot?.name && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span>CUSTOMER:</span>
                <span style={{ fontWeight: 'bold', textAlign: 'right', maxWidth: '65%' }}>
                  {invoice.customerSnapshot.name}
                </span>
              </div>
            )}
            {invoice.customerSnapshot?.taxId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>CUST TAX ID:</span>
                <span>{invoice.customerSnapshot.taxId}</span>
              </div>
            )}
          </div>

          <div style={{ margin: '4px 0', borderTop: '1px dashed #000000' }} />

          {/* Line Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: is58mm ? '10px' : '11px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000000' }}>
                <th style={{ textAlign: 'left', padding: '2px 0' }}>ITEM</th>
                <th style={{ textAlign: 'center', padding: '2px 0' }}>QTY</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>RATE</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>AMT</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((line, idx) => (
                <tr key={idx} style={{ verticalAlign: 'top' }}>
                  <td style={{ padding: '3px 0', wordBreak: 'break-word', maxWidth: is58mm ? '90px' : '130px' }}>
                    <div style={{ fontWeight: 'bold' }}>{line.name}</div>
                    {line.sku && <div style={{ fontSize: '9px', color: '#444' }}>{line.sku}</div>}
                  </td>
                  <td style={{ textAlign: 'center', padding: '3px 0' }}>{parseFloat(line.quantity)}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0' }}>{parseFloat(line.unitPrice).toFixed(2)}</td>
                  <td style={{ textAlign: 'right', padding: '3px 0', fontWeight: 'bold' }}>
                    {parseFloat(line.lineTotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ margin: '4px 0', borderTop: '1px dashed #000000' }} />

          {/* Totals Section */}
          <div style={{ fontSize: is58mm ? '10px' : '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>SUBTOTAL:</span>
              <span>{invoice.currency} {parseFloat(invoice.subtotal).toFixed(2)}</span>
            </div>
            {parseFloat(invoice.discountTotal) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                <span>DISCOUNT:</span>
                <span>-{invoice.currency} {parseFloat(invoice.discountTotal).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(invoice.taxTotal) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                <span>TAX/GST:</span>
                <span>{invoice.currency} {parseFloat(invoice.taxTotal).toFixed(2)}</span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 0',
              borderTop: '1px solid #000000',
              borderBottom: '1px solid #000000',
              fontWeight: 'bold',
              fontSize: is58mm ? '12px' : '14px',
              marginTop: '4px'
            }}>
              <span>TOTAL DUE:</span>
              <span>{invoice.currency} {parseFloat(invoice.totalAmount).toFixed(2)}</span>
            </div>

            {invoice.currency !== invoice.baseCurrency && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', padding: '2px 0' }}>
                <span>BASE EQUIV ({invoice.baseCurrency}):</span>
                <span>₹ {parseFloat(invoice.baseTotalAmount).toFixed(2)} (@ {parseFloat(invoice.exchangeRate).toFixed(2)})</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', marginTop: '2px' }}>
              <span>AMOUNT PAID:</span>
              <span>{invoice.currency} {parseFloat(invoice.paidAmount).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontWeight: 'bold' }}>
              <span>BALANCE:</span>
              <span>{invoice.currency} {parseFloat(invoice.outstandingAmount).toFixed(2)}</span>
            </div>
          </div>

          <div style={{ margin: '6px 0', borderTop: '1px dashed #000000' }} />

          {/* Barcode & Digital Payment QR Mockup */}
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <div style={{
              display: 'inline-block',
              letterSpacing: '4px',
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 'bold',
              border: '2px solid #000',
              padding: '2px 8px',
              backgroundColor: '#000',
              color: '#FFF'
            }}>
              ||| ||||| || |||| ||
            </div>
            <div style={{ fontSize: '9px', marginTop: '2px' }}>*{invoice.invoiceNumber}*</div>
          </div>

          {/* Footer Notice */}
          <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '10px' }}>
            <div style={{ fontWeight: 'bold' }}>THANK YOU FOR YOUR BUSINESS!</div>
            <div>Terms: {invoice.paymentTerms || 'Payment due as per invoice terms'}</div>
            <div style={{ marginTop: '4px', fontSize: '8px', color: '#555' }}>
              Powered by Levroun ERP Enterprise Billing
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS Rules */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
          }
          #receipt-area {
            width: ${widthPx} !important;
            margin: 0 auto !important;
            padding: 4px !important;
            box-shadow: none !important;
          }
          @page {
            margin: 0;
            size: ${widthPx} auto;
          }
        }
      `}</style>
    </>
  );
}
