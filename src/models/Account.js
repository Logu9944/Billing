import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] 
  },
  subType: { 
    type: String, 
    required: true,
    enum: [
      'CASH', 
      'BANK', 
      'ACCOUNTS_RECEIVABLE', 
      'INVENTORY_ASSET', 
      'OTHER_CURRENT_ASSET',
      'ACCOUNTS_PAYABLE', 
      'TAX_PAYABLE', 
      'OTHER_CURRENT_LIABILITY',
      'OWNERS_EQUITY', 
      'RETAINED_EARNINGS',
      'SALES_REVENUE', 
      'EXCHANGE_GAIN', 
      'OTHER_INCOME',
      'COST_OF_GOODS_SOLD', 
      'OPERATING_EXPENSE', 
      'EXCHANGE_LOSS'
    ]
  },
  currency: { type: String, required: true, default: 'INR', uppercase: true },
  currentBalance: { 
    type: mongoose.Schema.Types.Decimal128, 
    default: () => mongoose.Types.Decimal128.fromString('0.0000') 
  },
  isSystemAccount: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

AccountSchema.index({ organizationId: 1, code: 1 }, { unique: true });
AccountSchema.index({ organizationId: 1, type: 1 });

export default mongoose.models.Account || mongoose.model('Account', AccountSchema);
