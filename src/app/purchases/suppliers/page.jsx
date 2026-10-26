'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, Truck, RefreshCw, Edit2, Trash2 } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    currency: 'INR',
    taxId: '',
    paymentTermsDays: 30,
    address: { street: '', city: '', state: '', country: 'India', postalCode: '' }
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create supplier');
      }
      setModalOpen(false);
      setForm({
        name: '',
        code: '',
        email: '',
        phone: '',
        currency: 'INR',
        taxId: '',
        paymentTermsDays: 30,
        address: { street: '', city: '', state: '', country: 'India', postalCode: '' }
      });
      loadSuppliers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (supplier) => {
    setEditForm({
      id: supplier._id,
      name: supplier.name,
      code: supplier.code,
      email: supplier.email || '',
      phone: supplier.phone || '',
      currency: supplier.currency || 'INR',
      taxId: supplier.taxId || '',
      paymentTermsDays: supplier.paymentTermsDays || 30,
      address: {
        street: supplier.address?.street || '',
        city: supplier.address?.city || '',
        state: supplier.address?.state || '',
        country: supplier.address?.country || 'India',
        postalCode: supplier.address?.postalCode || ''
      }
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setEditError('');

    try {
      const res = await fetch('/api/suppliers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update supplier');
      }
      setEditModalOpen(false);
      loadSuppliers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (supplierId, supplierName) => {
    if (!window.confirm(`Are you sure you want to deactivate vendor "${supplierName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/suppliers?id=${supplierId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive supplier');
      }
      loadSuppliers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AppLayout
      title="Suppliers & Vendors"
      subtitle="Manage corporate vendors, multi-currency payables, and terms"
      actions={
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          <span>New Supplier</span>
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
            placeholder="Search supplier name, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
          />
        </div>

        <button className="btn btn-secondary" onClick={loadSuppliers} title="Refresh list">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Supplier Code</th>
              <th>Supplier Name</th>
              <th>Currency</th>
              <th>Terms</th>
              <th style={{ textAlign: 'right' }}>Outstanding Payable</th>
              <th>Contact</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>
                  Loading supplier records...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                  No suppliers registered yet. Click "New Supplier" to add a vendor.
                </td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{s.code}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.taxId && <div style={{ fontSize: '11px', color: '#64748B' }}>GSTIN: {s.taxId}</div>}
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                      {s.currency}
                    </span>
                  </td>
                  <td>Net {s.paymentTermsDays || 30} Days</td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: parseFloat(s.outstandingBalance) > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                  }}>
                    {s.currency} {parseFloat(s.outstandingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{s.email || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{s.phone}</div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', height: '28px' }}
                        onClick={() => handleEditOpen(s)}
                        title="Edit vendor profile"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          height: '28px',
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          border: '1px solid #FECACA'
                        }}
                        onClick={() => handleDelete(s._id, s.name)}
                        title="Archive vendor"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
            maxWidth: '540px',
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
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Create Vendor / Supplier</span>
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
                  <label className="form-label">Vendor Legal Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Dell India Pvt Ltd"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supplier Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="SUPP-1001 (auto if blank)"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Vendor Currency *</label>
                  <select
                    className="form-select"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    placeholder="29AABCB1234F1Z1"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="sales@dell.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 80 4455 6677"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && editForm && (
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
            maxWidth: '540px',
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
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Edit Vendor / Supplier</span>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Vendor Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vendor Code *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Settlement Currency</label>
                  <select
                    className="form-input"
                    value={editForm.currency}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  >
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={editForm.paymentTermsDays}
                    onChange={(e) => setEditForm({ ...editForm, paymentTermsDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Tax ID / GSTIN / VAT</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.taxId}
                  onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value.toUpperCase() })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Update Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
