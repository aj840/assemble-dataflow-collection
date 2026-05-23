import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

/* ─── Modal overlay ───────────────────────────────────────────────── */
const Overlay = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

/* ─── Status badge ────────────────────────────────────────────────── */
const StatusBadge = ({ value }) => {
  if (!value) return <span style={{ color: '#d1d5db' }}>—</span>;
  const isAccept = value === 'Accept';
  return (
    <span style={{
      background: isAccept ? '#f0fdf4' : '#fff1f2',
      color: isAccept ? '#16a34a' : '#dc2626',
      padding: '2px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 700,
    }}>
      {isAccept ? '✅ Accept' : '❌ Reject'}
    </span>
  );
};

const labelStyle = {
  display: 'block', marginBottom: 6, fontWeight: 600,
  fontSize: '0.78rem', letterSpacing: '0.04em',
  textTransform: 'uppercase', color: '#6b7280',
};

export default function AdminRndData() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);

  /* edit modal */
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
      if (includeDeleted) params.includeDeleted = 'true';
      const data = await api.getRnd(params);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStart, filterEnd, includeDeleted]);

  useEffect(() => { load(); }, [load]);

  /* ── export ── */
  const handleExport = () => {
    const params = {};
    if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
    if (includeDeleted) params.includeDeleted = 'true';
    window.open(api.exportRndUrl(params), '_blank');
  };

  /* ── delete (soft) ── */
  const handleDelete = async (entry) => {
    if (!window.confirm(`Soft-delete entry for "${entry.code}"? It can still appear in exports.`)) return;
    try {
      await api.deleteRndEntry(entry.id, { deletedBy: user?.fullName || 'Admin' });
      load();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  /* ── open edit ── */
  const openEdit = (entry) => {
    setEditTarget(entry);
    setEditForm({
      pickNumber: entry.pickNumber || '',
      acceptReject: entry.acceptReject || 'Accept',
      receivedCount: entry.receivedCount ?? 0,
      remark: entry.remark || '',
    });
    setEditError('');
  };

  /* ── save edit ── */
  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      await api.updateRndEntry(editTarget.id, { ...editForm, updatedBy: user?.fullName || 'Admin' });
      setEditTarget(null);
      load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="admin-view" style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>R&D Data</h2>
          <p className="text-muted text-sm">Review, edit and export experimental logs.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GlassIcon name="export" size={14} color="#374151" /> Excel Export
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <GlassIcon name="search" size={16} color="#6b7280" />
          <span className="text-muted text-sm" style={{ marginRight: 4 }}>Date Range:</span>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)}
            style={{ width: 140, fontSize: 13 }} />
          <span className="text-muted text-sm">to</span>
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)}
            style={{ width: 140, fontSize: 13 }} />

          {(filterStart || filterEnd) && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => { setFilterStart(''); setFilterEnd(''); }}>
              Clear Dates
            </button>
          )}

          {/* Include Deleted toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginLeft: 8, fontSize: 13, color: '#374151', userSelect: 'none' }}>
            <div
              onClick={() => setIncludeDeleted(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
                background: includeDeleted ? '#dc2626' : '#d1d5db',
                position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <div style={{
                position: 'absolute', top: 2,
                left: includeDeleted ? 18 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              }} />
            </div>
            Show Deleted Entries
          </label>

          <button className="btn btn-primary btn-sm" onClick={load}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <GlassIcon name="search" size={13} color="#fff" /> Apply Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassIcon name="settings" size={18} color="#2563eb" />
          <h3 style={{ margin: 0 }}>Logged R&D Entries</h3>
          <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{entries.length} entries</span>
          {includeDeleted && (
            <span style={{
              background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
              padding: '1px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, marginLeft: 8,
            }}>
              Showing Deleted
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <span className="spinner" style={{ display: 'inline-block' }} />
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <GlassIcon name="folder" size={48} color="#9ca3af" />
            </div>
            <p>No R&D records found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Pick #</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Received</th>
                  <th>Remark</th>
                  <th>Submitted By</th>
                  <th>Submitted At</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => {
                  const isDeleted = !!e.isDeleted;
                  return (
                    <tr
                      key={e.id}
                      style={{
                        opacity: isDeleted ? 0.5 : 1,
                        background: isDeleted ? '#fef2f2' : 'transparent',
                        textDecoration: isDeleted ? 'line-through' : 'none',
                      }}
                    >
                      <td style={{ color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <span className="badge badge-info" style={{ fontWeight: 700 }}>{e.code}</span>
                      </td>
                      <td style={{ fontSize: 13 }}>{e.description}</td>
                      <td style={{ fontSize: 13 }}>{e.category}</td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>
                        {e.pickNumber || <span style={{ color: '#d1d5db', textDecoration: 'none' }}>—</span>}
                      </td>
                      <td style={{ textDecoration: 'none' }}><StatusBadge value={e.acceptReject} /></td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{e.receivedCount ?? 0}</td>
                      <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 180 }}>
                        {e.remark || <span style={{ color: '#d1d5db', textDecoration: 'none' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500 }}>
                        {isDeleted
                          ? <span style={{ color: '#dc2626', fontSize: 11, textDecoration: 'none' }}>🗑 {e.deletedBy}</span>
                          : e.submittedBy}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—'}
                      </td>
                      <td style={{ textDecoration: 'none' }}>
                        {!isDeleted ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn-icon"
                              title="Edit Entry"
                              onClick={() => openEdit(e)}
                            >
                              <GlassIcon name="settings" size={15} color="#2563eb" />
                            </button>
                            <button
                              className="btn-icon"
                              title="Delete Entry"
                              onClick={() => handleDelete(e)}
                            >
                              <GlassIcon name="trash" size={15} color="#ef4444" />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>Deleted</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Entry Modal ── */}
      {editTarget && (
        <Overlay onClose={() => setEditTarget(null)}>
          <div className="card" style={{
            width: 500, padding: 32, borderRadius: 16,
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h3 style={{ margin: 0 }}>Edit R&D Entry</h3>
              <button onClick={() => setEditTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}>✕</button>
            </div>

            {/* Entry identity (read-only) */}
            <div style={{
              background: '#f8fafc', borderRadius: 8, padding: '10px 14px',
              marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <span className="badge badge-info" style={{ fontWeight: 700 }}>{editTarget.code}</span>
              <span style={{ fontSize: 13, color: '#6b7280' }}>{editTarget.description}</span>
            </div>

            {editError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{editError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Pick Number</label>
                <input type="text" className="input-field" placeholder="e.g. PKG-042"
                  value={editForm.pickNumber}
                  onChange={e => setEditForm({ ...editForm, pickNumber: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Result / Status</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Accept', 'Reject'].map(s => {
                    const isSelected = editForm.acceptReject === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, acceptReject: s })}
                        style={{
                          flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                          border: `2px solid ${isSelected ? (s === 'Accept' ? '#16a34a' : '#dc2626') : '#e5e7eb'}`,
                          background: isSelected ? (s === 'Accept' ? '#f0fdf4' : '#fff1f2') : '#fff',
                          color: isSelected ? (s === 'Accept' ? '#16a34a' : '#dc2626') : '#9ca3af',
                          fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                        }}
                      >
                        {s === 'Accept' ? '✅ Accept' : '❌ Reject'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Received Count</label>
                <input type="number" className="input-field" min="0"
                  value={editForm.receivedCount}
                  onChange={e => setEditForm({ ...editForm, receivedCount: e.target.value })} />
              </div>

              <div>
                <label style={labelStyle}>Remark</label>
                <input type="text" className="input-field" placeholder="Optional note…"
                  value={editForm.remark}
                  onChange={e => setEditForm({ ...editForm, remark: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving} style={{ minWidth: 120 }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
