import mongoose from 'mongoose';

const InventoryMovementSchema = new mongoose.Schema({
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
  movementType: { 
    type: String, 
    enum: [
      'OPENING_STOCK', 
      'PURCHASE_RECEIPT', 
      'SALE_DEDUCTION', 
      'ADJUSTMENT_IN', 
      'ADJUSTMENT_OUT',
      'SALE_RETURN',
      'PURCHASE_RETURN'
    ], 
    required: true 
  },
  quantity: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  }, // Always positive quantity of movement
  unitCost: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  totalCost: { 
    type: mongoose.Schema.Types.Decimal128, 
    required: true 
  },
  referenceType: { 
    type: String, 
    enum: ['INVOICE', 'SUPPLIER_BILL', 'MANUAL_ADJUSTMENT', 'OPENING_BALANCE'], 
    required: true 
  },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceNumber: { type: String, default: '', trim: true },
  date: { type: Date, required: true, default: Date.now },
  notes: { type: String, default: '' },
  idempotencyKey: { type: String, sparse: true, index: true }
}, {
  timestamps: true
});

InventoryMovementSchema.index({ organizationId: 1, productId: 1, date: -1 });

export default mongoose.models.InventoryMovement || mongoose.model('InventoryMovement', InventoryMovementSchema);
