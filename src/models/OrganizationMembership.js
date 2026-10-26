import mongoose from 'mongoose';

const OrganizationMembershipSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  role: { 
    type: String, 
    enum: ['OWNER', 'ADMIN', 'ACCOUNTANT', 'SALES', 'VIEWER'], 
    default: 'OWNER' 
  },
  permissions: [{
    type: String
  }],
  isDefault: { type: Boolean, default: false }
}, {
  timestamps: true
});

OrganizationMembershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

export default mongoose.models.OrganizationMembership || mongoose.model('OrganizationMembership', OrganizationMembershipSchema);
