import mongoose from 'mongoose';

const CurrencyRateSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  fromCurrency: { type: String, required: true, uppercase: true, trim: true },
  toCurrency: { type: String, required: true, uppercase: true, trim: true },
  rate: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  effectiveDate: { type: Date, required: true, default: Date.now },
  source: { 
    type: String, 
    enum: ['MANUAL', 'RBI', 'ECB', 'OPEN_EXCHANGE'], 
    default: 'MANUAL' 
  },
  notes: { type: String, default: '', trim: true }
}, {
  timestamps: true
});

CurrencyRateSchema.index({ organizationId: 1, fromCurrency: 1, toCurrency: 1, effectiveDate: -1 });

export default mongoose.models.CurrencyRate || mongoose.model('CurrencyRate', CurrencyRateSchema);
