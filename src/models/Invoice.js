import mongoose from 'mongoose';

const InvoiceLineSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: false 
  },
  sku: { type: String, default: '', trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
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
  discountPercent: { 
    type: mongoose.Schema.Types.Decimal128, 
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
  }, // In invoice currency
  baseLineTotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  } // In organization base currency
}, { _id: true });

const InvoiceSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  invoiceNumber: { type: String, required: true, trim: true },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    taxId: { type: String, default: '' },
    billingAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      country: { type: String, default: '' },
      postalCode: { type: String, default: '' }
    }
  },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  // Multi-Currency fields
  currency: { type: String, required: true, uppercase: true, trim: true }, // Customer/Invoice Currency (e.g. USD)
  baseCurrency: { type: String, required: true, uppercase: true, trim: true }, // Org Base Currency (e.g. INR)
  exchangeRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('1.0000') 
  },
  exchangeRateDate: { type: Date, default: Date.now },
  exchangeRateSource: { type: String, default: 'MANUAL' },

  status: { 
    type: String, 
    enum: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'], 
    default: 'DRAFT' 
  },

  lines: [InvoiceLineSchema],

  subtotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  discountTotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  taxTotal: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  totalAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // In invoice currency
  baseTotalAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // In base currency

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

  paymentTerms: { type: String, default: 'Net 30' },
  notes: { type: String, default: '' },
  termsConditions: { type: String, default: '' },

  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  idempotencyKey: { type: String, sparse: true, index: true }
}, {
  timestamps: true
});

InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ organizationId: 1, status: 1 });
InvoiceSchema.index({ organizationId: 1, dueDate: 1 });
InvoiceSchema.index({ organizationId: 1, customerId: 1 });

export default mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
