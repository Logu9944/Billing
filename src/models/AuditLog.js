import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  organizationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization', 
    required: true, 
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  userName: { type: String, default: 'System' },
  action: { 
    type: String, 
    required: true,
    enum: [
      'CREATE', 
      'UPDATE', 
      'DELETE', 
      'POST', 
      'VOID', 
      'REVERSE', 
      'PAYMENT_RECORDED', 
      'INVENTORY_ADJUSTED',
      'SETTINGS_CHANGED',
      'LOGIN'
    ] 
  },
  entityType: { 
    type: String, 
    required: true,
    enum: [
      'ORGANIZATION',
      'CUSTOMER',
      'SUPPLIER',
      'PRODUCT',
      'INVOICE',
      'SUPPLIER_BILL',
      'PAYMENT',
      'JOURNAL_ENTRY',
      'ACCOUNT',
      'INVENTORY',
      'SETTINGS'
    ]
  },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
  entityNumber: { type: String, default: '' },
  description: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
