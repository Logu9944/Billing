import mongoose from 'mongoose';

const SupplierBillLineSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: false 
  },
  description: { type: String, required: true, trim: true },
  quantity: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('1.0000') 
  },
  unitPrice: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  taxPercent: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  taxAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  lineTotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  baseLineTotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  expenseAccountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: false 
  }
}, { _id: true });

const SupplierBillSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  billNumber: { type: String, required: true, trim: true }, // Vendor's invoice number
  internalBillNumber: { type: String, required: true, trim: true }, // Our reference e.g. BILL-2026-0001
  supplierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Supplier', 
    required: true 
  },
  supplierSnapshot: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    taxId: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' }
    }
  },
  billDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  currency: { type: String, required: true, uppercase: true, trim: true },
  baseCurrency: { type: String, required: true, uppercase: true, trim: true },
  exchangeRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('1.0000') 
  },
  status: { 
    type: String, 
    enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'], 
    default: 'DRAFT' 
  },
  lines: [SupplierBillLineSchema],
  subtotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  taxTotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  totalAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  baseTotalAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  paidAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  outstandingAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  basePaidAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  baseOutstandingAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  notes: { type: String, default: '' },
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null }
}, {
  timestamps: true
});

SupplierBillSchema.index({ organizationId: 1, internalBillNumber: 1 }, { unique: true });
SupplierBillSchema.index({ organizationId: 1, supplierId: 1 });
SupplierBillSchema.index({ organizationId: 1, status: 1 });

export default mongoose.models.SupplierBill || mongoose.model('SupplierBill', SupplierBillSchema);
