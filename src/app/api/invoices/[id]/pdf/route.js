import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { Invoice, Organization } from '@/models';
import { InvoicePDFDocument } from '@/lib/pdf/invoice-template';
import React from 'react';

export async function GET(req, { params }) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findOne({
      _id: id,
      organizationId: organization._id
    }).lean();

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    // Render PDF to buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDFDocument, { invoice, organization })
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
