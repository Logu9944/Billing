import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { Account, Invoice, SupplierBill } from '@/models';
import { toDecimal, financial, round } from '@/lib/decimal';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const accounts = await Account.find({ organizationId: organization._id }).lean();

    // 1. Profit & Loss Computation
    let salesRevenue = toDecimal(0);
    let exchangeGain = toDecimal(0);
    let cogs = toDecimal(0);
    let operatingExpense = toDecimal(0);
    let exchangeLoss = toDecimal(0);

    for (const acc of accounts) {
      const bal = toDecimal(acc.currentBalance);
      if (acc.subType === 'SALES_REVENUE') salesRevenue = financial.add(salesRevenue, bal);
      else if (acc.subType === 'EXCHANGE_GAIN') exchangeGain = financial.add(exchangeGain, bal);
      else if (acc.subType === 'COST_OF_GOODS_SOLD') cogs = financial.add(cogs, bal);
      else if (acc.subType === 'OPERATING_EXPENSE') operatingExpense = financial.add(operatingExpense, bal);
      else if (acc.subType === 'EXCHANGE_LOSS') exchangeLoss = financial.add(exchangeLoss, bal);
    }

    const totalRevenue = financial.add(salesRevenue, exchangeGain);
    const grossProfit = financial.sub(totalRevenue, cogs);
    const totalExpenses = financial.add(operatingExpense, exchangeLoss);
    const netProfit = financial.sub(grossProfit, totalExpenses);

    // 2. Balance Sheet Computation
    let bankCash = toDecimal(0);
    let accountsReceivable = toDecimal(0);
    let inventoryAsset = toDecimal(0);
    let otherAssets = toDecimal(0);

    let accountsPayable = toDecimal(0);
    let taxPayable = toDecimal(0);
    let otherLiabilities = toDecimal(0);

    let equityCapital = toDecimal(0);
    let retainedEarnings = toDecimal(0);

    for (const acc of accounts) {
      const bal = toDecimal(acc.currentBalance);
      if (acc.type === 'ASSET') {
        if (acc.subType === 'BANK' || acc.subType === 'CASH') bankCash = financial.add(bankCash, bal);
        else if (acc.subType === 'ACCOUNTS_RECEIVABLE') accountsReceivable = financial.add(accountsReceivable, bal);
        else if (acc.subType === 'INVENTORY_ASSET') inventoryAsset = financial.add(inventoryAsset, bal);
        else otherAssets = financial.add(otherAssets, bal);
      } else if (acc.type === 'LIABILITY') {
        if (acc.subType === 'ACCOUNTS_PAYABLE') accountsPayable = financial.add(accountsPayable, bal);
        else if (acc.subType === 'TAX_PAYABLE') taxPayable = financial.add(taxPayable, bal);
        else otherLiabilities = financial.add(otherLiabilities, bal);
      } else if (acc.type === 'EQUITY') {
        if (acc.subType === 'OWNERS_EQUITY') equityCapital = financial.add(equityCapital, bal);
        else retainedEarnings = financial.add(retainedEarnings, bal);
      }
    }

    const totalAssets = financial.add(financial.add(bankCash, accountsReceivable), financial.add(inventoryAsset, otherAssets));
    const totalLiabilities = financial.add(accountsPayable, financial.add(taxPayable, otherLiabilities));
    // In double-entry, Current Net Profit flows to Equity!
    const totalEquity = financial.add(financial.add(equityCapital, retainedEarnings), netProfit);
    const totalLiabilitiesAndEquity = financial.add(totalLiabilities, totalEquity);

    // 3. AR Aging
    const openInvoices = await Invoice.find({
      organizationId: organization._id,
      status: { $in: ['ISSUED', 'PARTIALLY_PAID'] }
    }).lean();

    const now = new Date();
    const arAging = {
      current: '0.00',
      days30: '0.00',
      days60: '0.00',
      days90Plus: '0.00',
      total: '0.00'
    };

    let curDec = toDecimal(0);
    let d30Dec = toDecimal(0);
    let d60Dec = toDecimal(0);
    let d90Dec = toDecimal(0);

    for (const inv of openInvoices) {
      const bal = toDecimal(inv.baseOutstandingAmount || inv.outstandingAmount);
      const diffDays = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) curDec = financial.add(curDec, bal);
      else if (diffDays <= 30) d30Dec = financial.add(d30Dec, bal);
      else if (diffDays <= 60) d60Dec = financial.add(d60Dec, bal);
      else d90Dec = financial.add(d90Dec, bal);
    }

    arAging.current = curDec.toFixed(2);
    arAging.days30 = d30Dec.toFixed(2);
    arAging.days60 = d60Dec.toFixed(2);
    arAging.days90Plus = d90Dec.toFixed(2);
    arAging.total = financial.add(curDec, financial.add(d30Dec, financial.add(d60Dec, d90Dec))).toFixed(2);

    return NextResponse.json({
      success: true,
      data: {
        baseCurrency: organization.baseCurrency || 'INR',
        profitAndLoss: {
          salesRevenue: salesRevenue.toFixed(2),
          exchangeGain: exchangeGain.toFixed(2),
          totalRevenue: totalRevenue.toFixed(2),
          cogs: cogs.toFixed(2),
          grossProfit: grossProfit.toFixed(2),
          operatingExpense: operatingExpense.toFixed(2),
          exchangeLoss: exchangeLoss.toFixed(2),
          totalExpenses: totalExpenses.toFixed(2),
          netProfit: netProfit.toFixed(2)
        },
        balanceSheet: {
          assets: {
            bankCash: bankCash.toFixed(2),
            accountsReceivable: accountsReceivable.toFixed(2),
            inventoryAsset: inventoryAsset.toFixed(2),
            otherAssets: otherAssets.toFixed(2),
            totalAssets: totalAssets.toFixed(2)
          },
          liabilities: {
            accountsPayable: accountsPayable.toFixed(2),
            taxPayable: taxPayable.toFixed(2),
            otherLiabilities: otherLiabilities.toFixed(2),
            totalLiabilities: totalLiabilities.toFixed(2)
          },
          equity: {
            equityCapital: equityCapital.toFixed(2),
            retainedEarnings: retainedEarnings.toFixed(2),
            currentPeriodEarnings: netProfit.toFixed(2),
            totalEquity: totalEquity.toFixed(2)
          },
          totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.toFixed(2),
          isBalanced: financial.sub(totalAssets, totalLiabilitiesAndEquity).abs().lte(0.05)
        },
        arAging
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
