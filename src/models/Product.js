import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['GOODS', 'SERVICE'], 
    default: 'GOODS' 
  },
  description: { type: String, default: '', trim: true },
  unit: { type: String, default: 'pcs', trim: true },
  purchasePrice: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  sellingPrice: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true,
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  taxRate: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('18.0000') 
  }, // GST %
  hsnCode: { type: String, trim: true, default: '' },
  trackInventory: { type: Boolean, default: true },
  reorderLevel: { type: Number, default: 10 },
  currentStock: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  valuationMethod: { 
    type: String, 
    enum: ['FIFO', 'WEIGHTED_AVERAGE'], 
    default: 'WEIGHTED_AVERAGE' 
  },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

ProductSchema.index({ organizationId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ organizationId: 1, name: 1 });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
