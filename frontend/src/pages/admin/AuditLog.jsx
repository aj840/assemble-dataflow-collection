import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePreview, setDeletePreview] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.getAudit().then(setLogs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleShowDelete = async () => {
    if (!startDate || !endDate) return alert('Please select both start and end dates.');
    if (startDate > endDate) return alert('Start date must be before end date.');
    try {
      const logsToDelete = await api.getAudit({ startDate, endDate });
      setDeletePreview(logsToDelete);
      setDeleteModal(true);
    } catch (e) {
      console.error(e);
      alert('Failed to fetch logs for deletion preview.');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteAuditLogs({ startDate, endDate });
      setDeleteModal(false);
      setStartDate(''); setEndDate('');
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to delete logs.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = logs.filter(l =>
    l.action?.toLowerCase().includes(search.toLowerCase()) ||
    l.user?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Audit Log</h2>
          <p className="text-muted text-sm">Complete history of all system actions and user activity.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span className="text-muted">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          <button className="btn btn-danger btn-sm" onClick={handleShowDelete}>Show & Delete</button>
          
          <div className="search-input-wrap" style={{ marginLeft: 16 }}>
            <span className="search-icon"><GlassIcon name="audit" size={16} color="#94a3b8" /></span>
            <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3}>
                  <div className="empty-state">
                    <div className="icon"><GlassIcon name="history" size={48} color="#d1d5db" /></div>
                    <p>No audit logs found. Actions will appear here as users interact with the system.</p>
                  </div>
                </td></tr>
              ) : filtered.map(log => (
                <tr key={log.id}>
                  <td className="text-sm text-muted font-mono" style={{ whiteSpace: 'nowrap' }}>
                    {log.time ? new Date(log.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#2563eb' }}>
                        {log.user?.[0] || '?'}
                      </div>
                      <span style={{ fontWeight: 500 }}>{log.user}</span>
                    </div>
                  </td>
                  <td className="text-sm">{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
          <span className="text-sm text-muted">Showing {filtered.length} of {logs.length} log entries</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
              <div className="modal-header">
                <h3>Confirm Deletion of Audit Logs</h3>
                <button className="btn-icon" onClick={() => setDeleteModal(false)}>✕</button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}><GlassIcon name="warning" size={16} /> <span>WARNING: You are about to permanently delete <strong>{deletePreview.length}</strong> log entries from {startDate} to {endDate}. This action cannot be undone.</span></div>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  {deletePreview.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No logs found in this date range.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Time</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>User</th>
                          <th style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deletePreview.map(l => (
                          <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{new Date(l.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 500 }}>{l.user}</td>
                            <td style={{ padding: '8px 12px', fontSize: 13 }}>{l.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting || deletePreview.length === 0}>
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
