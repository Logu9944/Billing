import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 30,
    backgroundColor: '#FFFFFF',
    color: '#172B4D'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#102A43',
    paddingBottom: 15,
    marginBottom: 15
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#102A43',
    marginBottom: 4
  },
  companyDetails: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 1.3
  },
  invoiceTitleBlock: {
    textAlign: 'right'
  },
  invoiceTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#173B63',
    marginBottom: 4
  },
  invoiceMetaText: {
    fontSize: 8,
    color: '#64748B',
    lineHeight: 1.4
  },
  twoColSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  colBox: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 10
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#102A43',
    marginBottom: 3
  },
  partyDetail: {
    fontSize: 8,
    color: '#172B4D',
    lineHeight: 1.3
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 15
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    padding: 6
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 6
  },
  colDesc: { width: '42%' },
  colQty: { width: '12%', textAlign: 'right' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTax: { width: '13%', textAlign: 'right' },
  colTotal: { width: '18%', textAlign: 'right' },
  headerText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#102A43'
  },
  cellText: {
    fontSize: 8,
    color: '#172B4D'
  },
  cellTextBold: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#102A43'
  },
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 15
  },
  totalsBox: {
    width: '45%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    backgroundColor: '#FFFFFF'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '4 8',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: '6 8',
    backgroundColor: '#102A43',
    color: '#FFFFFF'
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#FFFFFF'
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#F4C542'
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    padding: 8,
    marginBottom: 15
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748B',
    marginBottom: 2
  },
  notesContent: {
    fontSize: 8,
    color: '#172B4D',
    lineHeight: 1.3
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#94A3B8'
  }
});

export function InvoicePDFDocument({ invoice, organization }) {
  const currency = invoice.currency || 'USD';
  const exchangeRate = invoice.exchangeRate?.toString() || '1.0000';
  const baseCurrency = organization.baseCurrency || 'INR';
  const isForeign = currency !== baseCurrency;

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.companyName}>{organization.name || 'Levroun India Private Limited'}</Text>
            <Text style={styles.companyDetails}>
              {organization.legalName}
              {'\n'}GSTIN / Tax ID: {organization.taxId || '29AABCL1234F1Z5'}
              {'\n'}Corporate Office: Bangalore, Karnataka, India
              {'\n'}Email: accounts@levroun.com | Website: www.levroun.com
            </Text>
          </View>

          <View style={styles.invoiceTitleBlock}>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
            <Text style={styles.invoiceMetaText}>
              Invoice #: {invoice.invoiceNumber}
              {'\n'}Date of Issue: {formatDate(invoice.issueDate)}
              {'\n'}Payment Due: {formatDate(invoice.dueDate)}
              {'\n'}Terms: {invoice.paymentTerms || 'Net 30'}
              {'\n'}Billing Currency: {currency}
            </Text>
          </View>
        </View>

        {/* Bill To / Ship To */}
        <View style={styles.twoColSection}>
          <View style={styles.colBox}>
            <Text style={styles.sectionTitle}>Billed To (Client)</Text>
            <Text style={styles.partyName}>{invoice.customerSnapshot?.name || 'Customer'}</Text>
            <Text style={styles.partyDetail}>
              {invoice.customerSnapshot?.billingAddress?.street || ''}
              {'\n'}{invoice.customerSnapshot?.billingAddress?.city || ''} {invoice.customerSnapshot?.billingAddress?.state || ''} {invoice.customerSnapshot?.billingAddress?.postalCode || ''}
              {'\n'}{invoice.customerSnapshot?.billingAddress?.country || ''}
              {invoice.customerSnapshot?.taxId ? `\nTax ID / VAT: ${invoice.customerSnapshot.taxId}` : ''}
              {invoice.customerSnapshot?.email ? `\nEmail: ${invoice.customerSnapshot.email}` : ''}
            </Text>
          </View>

          <View style={styles.colBox}>
            <Text style={styles.sectionTitle}>Remittance / Bank Details</Text>
            <Text style={styles.partyName}>Levroun India Treasury</Text>
            <Text style={styles.partyDetail}>
              Bank: State Bank of India
              {'\n'}Account: 409923881120
              {'\n'}IFSC: SBIN0004521
              {'\n'}SWIFT: SBININBB452 (For USD/EUR Remittance)
              {'\n'}Branch: Corporate Financial Hub, Bangalore
            </Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDesc]}>Item Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Unit Price ({currency})</Text>
            <Text style={[styles.headerText, styles.colTax]}>Tax %</Text>
            <Text style={[styles.headerText, styles.colTotal]}>Amount ({currency})</Text>
          </View>

          {(invoice.lines || []).map((line, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={styles.colDesc}>
                <Text style={styles.cellTextBold}>{line.name}</Text>
                {line.description ? <Text style={styles.cellText}>{line.description}</Text> : null}
              </View>
              <Text style={[styles.cellText, styles.colQty]}>{line.quantity?.toString() || '1'}</Text>
              <Text style={[styles.cellText, styles.colPrice]}>{parseFloat(line.unitPrice?.toString() || '0').toFixed(2)}</Text>
              <Text style={[styles.cellText, styles.colTax]}>{line.taxPercent?.toString() || '0'}%</Text>
              <Text style={[styles.cellTextBold, styles.colTotal]}>{parseFloat(line.lineTotal?.toString() || '0').toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals Summary */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.cellText}>Subtotal</Text>
              <Text style={styles.cellTextBold}>{currency} {parseFloat(invoice.subtotal?.toString() || '0').toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.cellText}>Tax / GST Total</Text>
              <Text style={styles.cellText}>{currency} {parseFloat(invoice.taxTotal?.toString() || '0').toFixed(2)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL AMOUNT DUE</Text>
              <Text style={styles.grandTotalValue}>{currency} {parseFloat(invoice.totalAmount?.toString() || '0').toFixed(2)}</Text>
            </View>
            {isForeign && (
              <View style={[styles.totalRow, { backgroundColor: '#F8FAFC' }]}>
                <Text style={{ fontSize: 7, color: '#64748B' }}>Accounting Base Value ({baseCurrency}):</Text>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#172B4D' }}>
                  {baseCurrency} {parseFloat(invoice.baseTotalAmount?.toString() || '0').toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Notes & Exchange Disclaimer */}
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>Notes & Terms</Text>
          <Text style={styles.notesContent}>
            {invoice.notes || 'Thank you for your business. Please ensure payment is remitted to the account details above.'}
            {isForeign ? `\n• Multi-Currency Notice: This invoice is issued in ${currency}. Fixed historical conversion rate: 1 ${currency} = ${exchangeRate} ${baseCurrency}.` : ''}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is a computer-generated tax invoice issued by Levroun India Private Limited.</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
}
