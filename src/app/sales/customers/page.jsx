'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, Building2, Mail, Phone, RefreshCw, Edit2, Trash2 } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    taxId: '',
    paymentTermsDays: 30,
    creditLimit: '0',
    billingAddress: { street: '', city: '', state: '', country: 'India', postalCode: '' }
  });

  const [form, setForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    currency: 'USD',
    taxId: '',
    paymentTermsDays: 30,
    creditLimit: '10000',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      country: 'United States',
      postalCode: ''
    }
  });

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create customer');
      }
      setModalOpen(false);
      setForm({
        name: '',
        code: '',
        email: '',
        phone: '',
        currency: 'USD',
        taxId: '',
        paymentTermsDays: 30,
        creditLimit: '10000',
        billingAddress: { street: '', city: '', state: '', country: 'United States', postalCode: '' }
      });
      loadCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditOpen = (customer) => {
    setEditForm({
      id: customer._id,
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      taxId: customer.taxId || '',
      paymentTermsDays: customer.paymentTermsDays || 30,
      creditLimit: customer.creditLimit || '0',
      billingAddress: {
        street: customer.billingAddress?.street || '',
        city: customer.billingAddress?.city || '',
        state: customer.billingAddress?.state || '',
        country: customer.billingAddress?.country || 'India',
        postalCode: customer.billingAddress?.postalCode || ''
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
      const res = await fetch('/api/customers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update customer');
      }
      setEditModalOpen(false);
      loadCustomers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to archive customer "${name}"? Past invoices will be preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive customer');
      }
      loadCustomers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <AppLayout
      title="Customers"
      subtitle="Manage corporate clients, multi-currency credit limits, and receivables"
      actions={
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          <span>New Customer</span>
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
            placeholder="Search by name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
          />
        </div>

        <button className="btn btn-secondary" onClick={loadCustomers} title="Refresh list">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Customer Code</th>
              <th>Customer Name</th>
              <th>Currency</th>
              <th>Payment Terms</th>
              <th style={{ textAlign: 'right' }}>Credit Limit</th>
              <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
              <th>Contact Info</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-secondary)' }}>
                  Loading enterprise records...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                  No customers found. Click "New Customer" to add your first commercial client.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c._id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-deep-blue)' }}>{c.code}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.taxId && <div style={{ fontSize: '11px', color: '#64748B' }}>Tax ID: {c.taxId}</div>}
                  </td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                      {c.currency}
                    </span>
                  </td>
                  <td>Net {c.paymentTermsDays || 30} Days</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {c.currency} {parseFloat(c.creditLimit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: parseFloat(c.outstandingBalance) > 0 ? 'var(--color-danger)' : 'var(--color-success)'
                  }}>
                    {c.currency} {parseFloat(c.outstandingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{c.email || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{c.phone}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEditOpen(c)}
                        title="Edit Customer"
                        style={{ padding: '4px 8px' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(c._id, c.name)}
                        title="Archive Customer"
                        style={{ padding: '4px 8px', color: 'var(--color-danger)' }}
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

      {/* New Customer Modal */}
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
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Create Commercial Customer</span>
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
                  <label className="form-label">Customer Legal Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Acme International LLC"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Code</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="CUST-1001 (auto if blank)"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Billing Currency *</label>
                  <select
                    className="form-select"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Terms (Days)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.paymentTermsDays}
                    onChange={(e) => setForm({ ...form, paymentTermsDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Tax ID / VAT / GSTIN</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.taxId}
                    onChange={(e) => setForm({ ...form, taxId: e.target.value })}
                    placeholder="US12345678"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Credit Limit</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.creditLimit}
                    onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
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
                    placeholder="billing@acme.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 415 555 2671"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ marginBottom: '6px' }}
                  placeholder="Street Address"
                  value={form.billingAddress.street}
                  onChange={(e) => setForm({ ...form, billingAddress: { ...form.billingAddress, street: e.target.value } })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="City"
                    value={form.billingAddress.city}
                    onChange={(e) => setForm({ ...form, billingAddress: { ...form.billingAddress, city: e.target.value } })}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="State"
                    value={form.billingAddress.state}
                    onChange={(e) => setForm({ ...form, billingAddress: { ...form.billingAddress, state: e.target.value } })}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Postal Code"
                    value={form.billingAddress.postalCode}
                    onChange={(e) => setForm({ ...form, billingAddress: { ...form.billingAddress, postalCode: e.target.value } })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
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
              <span style={{ fontSize: '16px', fontWeight: 600 }}>Edit Customer Details</span>
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
                <label className="form-label">Customer Legal Name *</label>
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
                  <label className="form-label">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.taxId}
                    onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Credit Limit</label>
                  <input
                    type="number"
                    className="form-input"
                    value={editForm.creditLimit}
                    onChange={(e) => setEditForm({ ...editForm, creditLimit: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Street"
                  value={editForm.billingAddress.street}
                  onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, street: e.target.value } })}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="City"
                    value={editForm.billingAddress.city}
                    onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, city: e.target.value } })}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="State"
                    value={editForm.billingAddress.state}
                    onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, state: e.target.value } })}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Postal Code"
                    value={editForm.billingAddress.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, postalCode: e.target.value } })}
                  />
                </div>
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
    </AppLayout>
  );
}
