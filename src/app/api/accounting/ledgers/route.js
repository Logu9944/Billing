import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { Account, JournalEntry } from '@/models';
import { toDecimal, financial, round } from '@/lib/decimal';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const url = new URL(req.url);
    const accountId = url.searchParams.get('accountId');

    if (!accountId) {
      // Return list of available ledger accounts
      const accounts = await Account.find({ organizationId: organization._id }).sort({ code: 1 }).lean();
      return NextResponse.json({
        success: true,
        data: {
          accounts: accounts.map(a => ({
            ...a,
            currentBalance: a.currentBalance?.toString() || '0.00'
          }))
        }
      });
    }

    const account = await Account.findOne({ _id: accountId, organizationId: organization._id }).lean();
    if (!account) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Find all journal entries that include lines for this account
    const entries = await JournalEntry.find({
      organizationId: organization._id,
      'lines.accountId': account._id,
      status: { $in: ['POSTED', 'REVERSED'] }
    }).sort({ date: 1, createdAt: 1 }).lean();

    const isDebitNormal = account.type === 'ASSET' || account.type === 'EXPENSE';

    let runningBalance = toDecimal(0);
    const ledgerLines = [];

    for (const entry of entries) {
      for (const line of entry.lines) {
        if (line.accountId.toString() === account._id.toString()) {
          const debit = toDecimal(line.debit);
          const credit = toDecimal(line.credit);

          // Update running balance
          if (isDebitNormal) {
            runningBalance = financial.add(runningBalance, financial.sub(debit, credit));
          } else {
            runningBalance = financial.add(runningBalance, financial.sub(credit, debit));
          }

          ledgerLines.push({
            entryId: entry._id,
            entryNumber: entry.entryNumber,
            date: entry.date,
            referenceType: entry.referenceType,
            referenceNumber: entry.referenceNumber,
            memo: entry.memo,
            description: line.description,
            debit: debit.toFixed(2),
            credit: credit.toFixed(2),
            foreignCurrency: line.foreignCurrency,
            foreignDebit: line.foreignDebit?.toString() || null,
            foreignCredit: line.foreignCredit?.toString() || null,
            exchangeRate: line.exchangeRate?.toString() || null,
            runningBalance: runningBalance.toFixed(2)
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        account: {
          ...account,
          currentBalance: account.currentBalance?.toString() || '0.00'
        },
        lines: ledgerLines,
        closingBalance: runningBalance.toFixed(2)
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
