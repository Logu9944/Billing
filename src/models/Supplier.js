import mongoose from 'mongoose';

const SupplierSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true, default: '' },
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  currency: { type: String, required: true, default: 'INR', uppercase: true, trim: true },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    postalCode: { type: String, default: '' }
  },
  taxId: { type: String, trim: true, default: '' }, // GSTIN / Tax ID
  paymentTermsDays: { type: Number, default: 30 },
  outstandingBalance: { type: mongoose.Schema.Types.Decimal128, default: () => mongoose.Types.Decimal128.fromString('0.0000') },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

SupplierSchema.index({ organizationId: 1, name: 1 });
SupplierSchema.index({ organizationId: 1, code: 1 });

export default mongoose.models.Supplier || mongoose.model('Supplier', SupplierSchema);
