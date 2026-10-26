import mongoose from 'mongoose';

const JournalLineSchema = new mongoose.Schema({
  accountId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account', 
    required: true 
  },
  accountCode: { type: String, required: true },
  accountName: { type: String, required: true },
  description: { type: String, default: '', trim: true },
  debit: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  credit: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  foreignCurrency: { type: String, uppercase: true, default: null },
  foreignDebit: { type: mongoose.Schema.Types.Decimal128, default: null },
  foreignCredit: { type: mongoose.Schema.Types.Decimal128, default: null },
  exchangeRate: { type: mongoose.Schema.Types.Decimal128, default: null }
}, { _id: false });

const JournalEntrySchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  entryNumber: { type: String, required: true, trim: true },
  date: { type: Date, required: true, default: Date.now },
  referenceType: { 
    type: String, 
    enum: ['INVOICE', 'SUPPLIER_BILL', 'PAYMENT', 'STOCK_ADJUSTMENT', 'MANUAL', 'REVERSAL'], 
    default: 'MANUAL' 
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceNumber: { type: String, default: '', trim: true },
  memo: { type: String, required: true, trim: true },
  status: { 
    type: String, 
    enum: ['DRAFT', 'POSTED', 'VOIDED', 'REVERSED'], 
    default: 'POSTED' 
  },
  currency: { type: String, required: true, uppercase: true }, // Base currency
  totalDebit: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  totalCredit: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  lines: [JournalLineSchema],
  reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  reversedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
  idempotencyKey: { type: String, sparse: true, index: true }
}, {
  timestamps: true
});

JournalEntrySchema.index({ organizationId: 1, entryNumber: 1 }, { unique: true });
JournalEntrySchema.index({ organizationId: 1, date: -1 });
JournalEntrySchema.index({ organizationId: 1, referenceType: 1, referenceId: 1 });

export default mongoose.models.JournalEntry || mongoose.model('JournalEntry', JournalEntrySchema);
