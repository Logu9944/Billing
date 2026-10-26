import { NextResponse } from 'next/server';
import { withTransaction, connectDB } from '@/lib/db';
import { requireOrgContext, requireRole } from '@/lib/auth';
import { Invoice, Customer, AuditLog } from '@/models';
import { reverseJournalEntry } from '@/lib/accounting-engine';
import { toDecimal, toDecimal128, financial } from '@/lib/decimal';

export async function GET(req, { params }) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findOne({
      _id: id,
      organizationId: organization._id
    }).populate('customerId').lean();

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // Check overdue status
    const isOverdue = invoice.status !== 'PAID' && invoice.status !== 'VOID' && new Date(invoice.dueDate) < new Date();

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        organization: {
          name: organization.name,
          taxId: organization.taxId || '',
          baseCurrency: organization.baseCurrency || 'INR',
          address: organization.address || {},
          phone: organization.phone || '',
          email: organization.email || ''
        },
        isOverdue,
        exchangeRate: invoice.exchangeRate?.toString() || '1.0000',
        totalAmount: invoice.totalAmount?.toString() || '0.00',
        baseTotalAmount: invoice.baseTotalAmount?.toString() || '0.00',
        paidAmount: invoice.paidAmount?.toString() || '0.00',
        outstandingAmount: invoice.outstandingAmount?.toString() || '0.00',
        subtotal: invoice.subtotal?.toString() || '0.00',
        taxTotal: invoice.taxTotal?.toString() || '0.00',
        discountTotal: invoice.discountTotal?.toString() || '0.00',
        lines: (invoice.lines || []).map(line => ({
          ...line,
          quantity: line.quantity?.toString() || '1',
          unitPrice: line.unitPrice?.toString() || '0.00',
          discountPercent: line.discountPercent?.toString() || '0',
          taxPercent: line.taxPercent?.toString() || '0',
          taxAmount: line.taxAmount?.toString() || '0.00',
          lineTotal: line.lineTotal?.toString() || '0.00',
          baseLineTotal: line.baseLineTotal?.toString() || '0.00'
        }))
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}

/**
 * Handles invoice actions (e.g. action: 'VOID')
 */
export async function POST(req, { params }) {
  try {
    const { user, membership, organization } = await requireOrgContext(req);
    requireRole(membership, ['OWNER', 'ADMIN']);
    const { id } = await params;
    const body = await req.json();
    const action = body.action;

    if (action === 'VOID') {
      const result = await withTransaction(async (session) => {
        const invoice = await Invoice.findOne({
          _id: id,
          organizationId: organization._id
        }).session(session);

        if (!invoice) {
          throw new Error('Invoice not found');
        }

        if (invoice.status === 'VOID') {
          throw new Error('Invoice is already voided');
        }

        if (toDecimal(invoice.paidAmount).gt(0)) {
          throw new Error('Cannot void an invoice that has payments recorded. Reverse payments first.');
        }

        // Relieve customer outstanding balance
        if (invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID') {
          const customer = await Customer.findById(invoice.customerId).session(session);
          if (customer) {
            const newBal = financial.sub(toDecimal(customer.outstandingBalance), toDecimal(invoice.outstandingAmount));
            customer.outstandingBalance = toDecimal128(newBal.gte(0) ? newBal : 0);
            await customer.save({ session });
          }

          // Reverse Journal Entry
          if (invoice.journalEntryId) {
            await reverseJournalEntry({
              organizationId: organization._id,
              journalEntryId: invoice.journalEntryId,
              reason: `Voided Invoice ${invoice.invoiceNumber}`,
              session
            });
          }
        }

        invoice.status = 'VOID';
        invoice.outstandingAmount = toDecimal128(0);
        invoice.baseOutstandingAmount = toDecimal128(0);
        await invoice.save({ session });

        await AuditLog.create([{
          organizationId: organization._id,
          userId: user.userId,
          userName: user.name,
          action: 'VOID',
          entityType: 'INVOICE',
          entityId: invoice._id,
          entityNumber: invoice.invoiceNumber,
          description: `Voided invoice ${invoice.invoiceNumber} and reversed accounting journal`
        }], { session });

        return invoice;
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 400 });
  }
}
