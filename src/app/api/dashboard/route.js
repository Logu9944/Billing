import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireOrgContext } from '@/lib/auth';
import { 
  Invoice, 
  Payment, 
  SupplierBill, 
  Product, 
  JournalEntry,
  Customer 
} from '@/models';
import { toDecimal, financial, round } from '@/lib/decimal';

export async function GET(req) {
  try {
    const { organization } = await requireOrgContext(req);
    await connectDB();

    const baseCurrency = organization.baseCurrency || 'INR';

    // Execute dashboard queries concurrently in parallel
    const [invoices, bills, lowStockProducts, recentInvoices] = await Promise.all([
      Invoice.find({ organizationId: organization._id, status: { $ne: 'VOID' } }).lean(),
      SupplierBill.find({ organizationId: organization._id, status: { $ne: 'VOID' } }).lean(),
      Product.find({
        organizationId: organization._id,
        trackInventory: true,
        $expr: { $lte: ['$currentStock', '$reorderLevel'] }
      }).limit(5).lean(),
      Invoice.find({ organizationId: organization._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    let totalInvoicedBase = toDecimal(0);
    let totalOutstandingBase = toDecimal(0);
    let totalPaidBase = toDecimal(0);
    let overdueCount = 0;
    let overdueAmountBase = toDecimal(0);

    const now = new Date();

    for (const inv of invoices) {
      const baseTotal = toDecimal(inv.baseTotalAmount);
      const baseOut = toDecimal(inv.baseOutstandingAmount);
      const basePaid = toDecimal(inv.basePaidAmount);

      totalInvoicedBase = financial.add(totalInvoicedBase, baseTotal);
      totalOutstandingBase = financial.add(totalOutstandingBase, baseOut);
      totalPaidBase = financial.add(totalPaidBase, basePaid);

      if (inv.status !== 'PAID' && new Date(inv.dueDate) < now) {
        overdueCount++;
        overdueAmountBase = financial.add(overdueAmountBase, baseOut);
      }
    }

    // 2. Expenses / Bills metrics
    let totalExpensesBase = toDecimal(0);
    for (const b of bills) {
      totalExpensesBase = financial.add(totalExpensesBase, toDecimal(b.baseTotalAmount));
    }

    // 3. Currency breakdown (USD vs INR vs others)
    const currencyMap = {};
    for (const inv of invoices) {
      const curr = inv.currency;
      if (!currencyMap[curr]) {
        currencyMap[curr] = { currency: curr, total: toDecimal(0), count: 0 };
      }
      currencyMap[curr].total = financial.add(currencyMap[curr].total, toDecimal(inv.totalAmount));
      currencyMap[curr].count++;
    }

    const currencyOverview = Object.values(currencyMap).map(c => ({
      currency: c.currency,
      count: c.count,
      total: c.total.toFixed(2)
    }));

    // 6. Dynamic revenue trend (last 6 months distribution)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenueMap = {};
    const monthlyRevenue = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = monthNames[d.getMonth()];
      monthlyRevenueMap[key] = { label, total: toDecimal(0) };
      monthlyRevenue.push({ key, month: label });
    }

    for (const inv of invoices) {
      if (inv.issueDate) {
        const idate = new Date(inv.issueDate);
        const key = `${idate.getFullYear()}-${idate.getMonth()}`;
        if (monthlyRevenueMap[key]) {
          monthlyRevenueMap[key].total = financial.add(monthlyRevenueMap[key].total, toDecimal(inv.baseTotalAmount));
        }
      }
    }

    const revenueTrend = monthlyRevenue.map(m => ({
      month: m.month,
      revenue: parseFloat(monthlyRevenueMap[m.key].total.toFixed(2))
    }));

    return NextResponse.json({
      success: true,
      data: {
        baseCurrency,
        totalInvoiced: totalInvoicedBase.toFixed(2),
        paymentsReceived: totalPaidBase.toFixed(2),
        outstandingReceivables: totalOutstandingBase.toFixed(2),
        overdueCount,
        overdueAmount: overdueAmountBase.toFixed(2),
        totalExpenses: totalExpensesBase.toFixed(2),
        currencyOverview,
        inventoryAlerts: lowStockProducts.map(p => ({
          id: p._id,
          name: p.name,
          sku: p.sku,
          currentStock: p.currentStock?.toString() || '0',
          reorderLevel: p.reorderLevel,
          unit: p.unit
        })),
        recentTransactions: recentInvoices.map(inv => ({
          id: inv._id,
          type: 'INVOICE',
          number: inv.invoiceNumber,
          party: inv.customerSnapshot?.name,
          date: inv.issueDate,
          currency: inv.currency,
          amount: inv.totalAmount?.toString() || '0.00',
          baseAmount: inv.baseTotalAmount?.toString() || '0.00',
          status: inv.status
        })),
        revenueTrend
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode || 500 });
  }
}
