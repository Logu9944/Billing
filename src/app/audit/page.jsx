'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { ShieldCheck, RefreshCw } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAudit = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  return (
    <AppLayout
      title="Audit Trail & Financial Governance"
      subtitle="Immutable event log of all system mutations, invoice issuances, payments, and accounting reversals"
      actions={
        <button className="btn btn-secondary" onClick={loadAudit}>
          <RefreshCw size={14} />
          <span>Refresh Audit</span>
        </button>
      }
    >
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Entity</th>
              <th>User</th>
              <th>Event Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px' }}>Loading audit logs...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                  No audit entries recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: '12px', color: '#64748B', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td>
                    <span className="badge badge-issued">{log.action}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {log.entityType} {log.entityNumber ? `(${log.entityNumber})` : ''}
                  </td>
                  <td>{log.userName || 'System'}</td>
                  <td>{log.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
