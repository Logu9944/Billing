import mongoose from 'mongoose';

const StockBalanceSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    index: true 
  },
  currentQuantity: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  averageUnitCost: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  totalValuation: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

StockBalanceSchema.index({ organizationId: 1, productId: 1 }, { unique: true });

export default mongoose.models.StockBalance || mongoose.model('StockBalance', StockBalanceSchema);
