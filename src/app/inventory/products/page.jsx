'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, Package, AlertTriangle, RefreshCw, Edit2, Trash2, Barcode } from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    description: '',
    unit: 'pcs',
    purchasePrice: '0',
    sellingPrice: '0',
    taxRate: '18',
    hsnCode: '',
    reorderLevel: 10
  });

  const [form, setForm] = useState({
    name: '',
    sku: '',
    type: 'GOODS',
    description: '',
    unit: 'pcs',
    purchasePrice: '0',
    sellingPrice: '0',
    taxRate: '18',
    hsnCode: '',
    trackInventory: true,
    reorderLevel: 10,
    openingStock: '0'
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          purchasePrice: parseFloat(form.purchasePrice) || 0,
          sellingPrice: parseFloat(form.sellingPrice) || 0,
          taxRate: parseFloat(form.taxRate) || 0,
          reorderLevel: parseInt(form.reorderLevel) || 0,
          openingStock: parseFloat(form.openingStock) || 0
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create product');
      }

      setModalOpen(false);
      setForm({
        name: '',
        sku: '',
        type: 'GOODS',
        description: '',
        unit: 'pcs',
        purchasePrice: '0',
        sellingPrice: '0',
        taxRate: '18',
        hsnCode: '',
        trackInventory: true,
        reorderLevel: 10,
        openingStock: '0'
      });
      loadProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (product) => {
    setEditForm({
      id: product._id,
      name: product.name || '',
      description: product.description || '',
      unit: product.unit || 'pcs',
      purchasePrice: product.purchasePrice || '0',
      sellingPrice: product.sellingPrice || '0',
      taxRate: product.taxRate || '18',
      hsnCode: product.hsnCode || '',
      reorderLevel: product.reorderLevel || 10
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setEditError('');

    try {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update product');
      }
      setEditModalOpen(false);
      loadProducts();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to archive product "${name}"? Historical sales and inventory records will be preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive product');
      }
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AppLayout
      title="Products & Services"
      subtitle="Catalog of goods and services, SKU configurations, pricing, and stock balances"
      actions={
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          <span>New Product / Service</span>
        </button>
      }
    >
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-input)',
          padding: '6px 12px',
          width: '320px'
        }}>
          <Search size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search by SKU, product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
          />
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={() => setScannerOpen(true)}
          title="Scan Product Barcode"
          id="btn-scan-product-barcode"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-deep-blue)' }}
        >
          <Barcode size={14} />
          <span>Scan Barcode</span>
        </button>

        <button className="btn btn-secondary" onClick={loadProducts} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product / Service Name</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Cost Price (INR)</th>
              <th style={{ textAlign: 'right' }}>Selling Price (INR)</th>
              <th style={{ textAlign: 'right' }}>Tax %</th>
              <th style={{ textAlign: 'right' }}>Stock on Hand</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>
                  Loading catalog...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                  No items in catalog. Click "New Product / Service" to add inventory or service offerings.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const stock = parseFloat(p.currentStock) || 0;
                const reorder = p.reorderLevel || 10;
                const isLow = p.trackInventory && stock <= reorder;

                return (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{p.sku}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.hsnCode && <div style={{ fontSize: '11px', color: '#64748B' }}>HSN/SAC: {p.hsnCode}</div>}
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: p.type === 'GOODS' ? '#EFF6FF' : '#F3E8FF', color: p.type === 'GOODS' ? '#1D4ED8' : '#7E22CE' }}>
                        {p.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(p.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(p.sellingPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right' }}>{parseFloat(p.taxRate).toFixed(0)}%</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {p.trackInventory ? `${stock} ${p.unit || 'pcs'}` : '—'}
                    </td>
                    <td>
                      {p.trackInventory ? (
                        isLow ? (
                          <span className="badge badge-void" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={10} />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="badge badge-paid">IN STOCK</span>
                        )
                      ) : (
                        <span className="badge badge-draft">SERVICE</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEditOpen(p)}
                          title="Edit Product"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDelete(p._id, p.name)}
                          title="Archive Product"
                          style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-modal)',
            width: '100%',
            maxWidth: '560px',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: 'var(--color-dark-navy)',
              color: '#FFFFFF',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Create Product / Service Item</span>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer' }}
              >✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '20px' }}>
              {error && (
                <div style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '14px',
                  fontSize: '13px'
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Item Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Enterprise License or Dell Server"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                    placeholder="e.g. PROD-SRV-01"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Type *</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value, trackInventory: e.target.value === 'GOODS' })}
                  >
                    <option value="GOODS">Goods (Inventory)</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit of Measure</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="pcs, box, hrs"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST / Tax Rate %</label>
                  <select
                    className="form-select"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST (Standard)</option>
                    <option value="28">28% GST</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Purchase / Cost Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={form.purchasePrice}
                    onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Standard Selling Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-input"
                    value={form.sellingPrice}
                    onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                  />
                </div>
              </div>

              {form.type === 'GOODS' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Opening Stock Quantity</label>
                    <input
                      type="number"
                      step="1"
                      className="form-input"
                      value={form.openingStock}
                      onChange={(e) => setForm({ ...form, openingStock: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Low Stock Reorder Level</label>
                    <input
                      type="number"
                      step="1"
                      className="form-input"
                      value={form.reorderLevel}
                      onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(16, 42, 67, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 'var(--radius-modal)',
            width: '100%',
            maxWidth: '560px',
            boxShadow: 'var(--shadow-modal)',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: 'var(--color-deep-blue)',
              color: '#FFFFFF',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Edit Product / Service</span>
              <button 
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '18px', cursor: 'pointer' }}
              >✕</button>
            </div>

            <form onSubmit={handleUpdate} style={{ padding: '20px' }}>
              {editError && (
                <div style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  marginBottom: '14px',
                  fontSize: '13px'
                }}>
                  {editError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Selling Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-input"
                    value={editForm.sellingPrice}
                    onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cost / Purchase Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={editForm.purchasePrice}
                    onChange={(e) => setEditForm({ ...editForm, purchasePrice: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Tax Rate %</label>
                  <select
                    className="form-select"
                    value={editForm.taxRate}
                    onChange={(e) => setEditForm({ ...editForm, taxRate: e.target.value })}
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reorder Level</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.reorderLevel}
                    onChange={(e) => setEditForm({ ...editForm, reorderLevel: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">HSN/SAC Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.hsnCode}
                  onChange={(e) => setEditForm({ ...editForm, hsnCode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BarcodeScannerModal 
        isOpen={scannerOpen} 
        onClose={() => setScannerOpen(false)} 
        onScan={(code) => setSearch(code)} 
        title="Scan Barcode to Filter Inventory"
      />
    </AppLayout>
  );
}
