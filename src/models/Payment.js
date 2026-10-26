import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  paymentNumber: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['RECEIPT', 'DISBURSEMENT'], 
    required: true 
  }, // RECEIPT = Customer payment, DISBURSEMENT = Supplier bill / Expense payment
  partyType: { 
    type: String, 
    enum: ['CUSTOMER', 'SUPPLIER'], 
    required: true 
  },
  partyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  partyName: { type: String, required: true },
  paymentDate: { type: Date, required: true, default: Date.now },
  paymentMethod: { 
    type: String, 
    enum: ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI', 'CREDIT_CARD'], 
    default: 'BANK_TRANSFER' 
  },
  depositAccountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true 
  }, // Bank or Cash Account
  paymentCurrency: { type: String, required: true, uppercase: true, trim: true },
  paymentAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  baseCurrency: { type: String, required: true, uppercase: true, trim: true },
  exchangeRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('1.0000') 
  }, // Exchange rate on payment date
  exchangeRateDate: { type: Date, default: Date.now },
  exchangeRateSource: { type: String, default: 'MANUAL' },
  basePaymentAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  unallocatedAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  reference: { type: String, default: '', trim: true },
  notes: { type: String, default: '' },
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  idempotencyKey: { type: String, sparse: true, index: true },
  status: { 
    type: String, 
    enum: ['POSTED', 'VOIDED'], 
    default: 'POSTED' 
  }
}, {
  timestamps: true
});

PaymentSchema.index({ organizationId: 1, paymentNumber: 1 }, { unique: true });
PaymentSchema.index({ organizationId: 1, paymentDate: -1 });
PaymentSchema.index({ organizationId: 1, partyId: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
