import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  legalName: { type: String, required: true, trim: true },
  taxId: { type: String, trim: true, default: '' }, // GSTIN / Tax ID
  baseCurrency: { type: String, required: true, default: 'INR', uppercase: true, trim: true },
  fiscalYearStartMonth: { type: Number, default: 4 }, // April (India standard)
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    postalCode: { type: String, default: '' }
  },
  email: { type: String, trim: true, lowercase: true, default: '' },
  phone: { type: String, trim: true, default: '' },
  website: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

OrganizationSchema.index({ name: 1 });

export default mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
