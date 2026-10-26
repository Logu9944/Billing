import mongoose from 'mongoose';

const OrganizationSettingsSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    unique: true,
    index: true 
  },
  invoicePrefix: { type: String, default: 'INV-' },
  nextInvoiceNumber: { type: Number, default: 1001 },
  billPrefix: { type: String, default: 'BILL-' },
  nextBillNumber: { type: Number, default: 1001 },
  paymentPrefix: { type: String, default: 'PAY-' },
  nextPaymentNumber: { type: Number, default: 1001 },
  journalPrefix: { type: String, default: 'JE-' },
  nextJournalNumber: { type: Number, default: 1001 },
  defaultPaymentTermsDays: { type: Number, default: 30 },
  defaultTaxRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('18.0000') 
  },
  autoPostInvoices: { type: Boolean, default: true },
  autoPostBills: { type: Boolean, default: true },
  exchangeRateProvider: { 
    type: String, 
    enum: ['MANUAL', 'RBI', 'ECB', 'OPEN_EXCHANGE'], 
    default: 'MANUAL' 
  },
  inventoryValuationMethod: {
    type: String,
    enum: ['WEIGHTED_AVERAGE', 'FIFO'],
    default: 'WEIGHTED_AVERAGE'
  },
  termsAndConditions: { 
    type: String, 
    default: 'Payment is due within stated terms. Please direct inquiries to accounts department.' 
  },
  notes: { 
    type: String, 
    default: 'Thank you for your business.' 
  }
}, {
  timestamps: true
});

export default mongoose.models.OrganizationSettings || mongoose.model('OrganizationSettings', OrganizationSettingsSchema);
