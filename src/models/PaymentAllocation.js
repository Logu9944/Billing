import mongoose from 'mongoose';

const PaymentAllocationSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment', 
    required: true,
    index: true 
  },
  targetType: { 
    type: String, 
    enum: ['INVOICE', 'SUPPLIER_BILL'], 
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true,
    index: true 
  },
  targetNumber: { type: String, required: true },
  allocatedAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // In invoice/bill currency
  documentCurrency: { type: String, required: true, uppercase: true },
  originalExchangeRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // Rate when invoice was issued
  paymentExchangeRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // Rate on payment date
  originalBaseAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // AR/AP relief at original rate
  paymentBaseAmount: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // Bank received at payment rate
  exchangeGainLoss: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  }, // Positive = Gain, Negative = Loss
  allocatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

PaymentAllocationSchema.index({ organizationId: 1, paymentId: 1, targetId: 1 });

export default mongoose.models.PaymentAllocation || mongoose.model('PaymentAllocation', PaymentAllocationSchema);
