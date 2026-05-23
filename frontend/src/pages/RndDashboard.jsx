import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassIcon from '../components/GlassIcon';
import { api } from '../services/api';

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

export default function RndDashboard({ onBack, onNewEntry }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Date Filters
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

  // Product Catalog Modal
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStart && filterEnd) {
        params.startDate = filterStart;
        params.endDate = filterEnd;
      }
      const data = await api.getRnd(params);
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStart, filterEnd]);

  useEffect(() => { load(); }, [load]);

  const loadCatalog = async () => {
    setShowCatalog(true);
    setLoadingCatalog(true);
    try {
      const data = await api.getRndProducts();
      setCatalog(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Are you sure you want to delete the entry for product code "${entry.code}"?`)) return;
    try {
      await api.deleteRndEntry(entry.id, { deletedBy: user?.fullName || 'User' });
      load(); // Refresh list after deletion
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  };

  const filtered = entries.filter(e =>
    !search ||
    e.code?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase()) ||
    e.pickNumber?.toLowerCase().includes(search.toLowerCase()) ||
    e.remark?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalEntries  = entries.length;
  const myEntries     = entries.filter(e => e.submittedBy === user?.fullName).length;
  const accepted      = entries.filter(e => e.acceptReject === 'Accept').length;

  const StatusBadge = ({ value }) => {
    const isAccept = value === 'Accept';
    return (
      <span style={{
        background: isAccept ? '#f0fdf4' : '#fff1f2',
        color: isAccept ? '#16a34a' : '#dc2626',
        padding: '2px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}>
        {isAccept ? '✅ Accept' : '❌ Reject'}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand">
            <div className="navbar-logo">◇</div>
            UltraHuman Assembly
          </div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span style={{ margin: '0 8px', color: '#d1d5db' }}>/</span>
            <span>R&D Dashboard</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-chip">
            <div style={{ position: 'relative' }}>
              <div className="user-avatar">{user?.fullName?.[0] || 'U'}</div>
              <div className="online-dot" />
            </div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">{user?.role === 'admin' ? 'Administrator' : 'Data Entry'}</div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={onNewEntry}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <GlassIcon name="settings" size={14} color="#ffffff" /> New R&D Entry
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>R&D Dashboard</h1>
          <p className="text-muted">View all logged experimental product entries and track R&D progress.</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <div className="card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#2563eb18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassIcon name="database" size={22} color="#2563eb" />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb', lineHeight: 1 }}>{totalEntries}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>Total Entries</div>
          </div>
          
          <div className="card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#7c3aed18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassIcon name="plan" size={22} color="#7c3aed" />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1 }}>{myEntries}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>My Entries</div>
          </div>

          <div 
            className="card" 
            style={{ padding: '18px 20px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.1s', border: '1px solid transparent' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = '#14b8a6'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent'; }}
            onClick={loadCatalog}
            title="Click to view full product catalog"
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#14b8a618', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassIcon name="folder" size={22} color="#14b8a6" />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#14b8a6', lineHeight: 1 }}>Catalog</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>View Product Codes</div>
          </div>

          <div className="card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#16a34a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GlassIcon name="card" size={22} color="#16a34a" />
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{accepted}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>Accepted</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="text-muted text-sm" style={{ fontWeight: 500 }}>Date Range:</span>
            <input 
              type="date" 
              className="input-field" 
              value={filterStart} 
              onChange={e => setFilterStart(e.target.value)}
              style={{ width: 140, padding: '6px 10px', fontSize: 13 }} 
            />
            <span className="text-muted text-sm">to</span>
            <input 
              type="date" 
              className="input-field" 
              value={filterEnd} 
              onChange={e => setFilterEnd(e.target.value)}
              style={{ width: 140, padding: '6px 10px', fontSize: 13 }} 
            />
            {(filterStart || filterEnd) && (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => { setFilterStart(''); setFilterEnd(''); }}
              >
                Clear Dates
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Apply
            </button>
          </div>

          <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 8px' }}></div>

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <GlassIcon name="search" size={16} color="#6b7280" />
            <input
              className="input-field"
              placeholder="Search by code, description, pick number or remark…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14 }}
            />
            {search && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}>Clear</button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GlassIcon name="search" size={13} color="#374151" /> Refresh
            </button>
          </div>
        </div>

        {/* Entries Table */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GlassIcon name="history" size={18} color="#2563eb" />
            <h3 style={{ margin: 0 }}>R&D Entries</h3>
            <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{filtered.length} entries</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <span className="spinner" style={{ display: 'inline-block' }} />
              <p className="text-muted" style={{ marginTop: 12 }}>Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <GlassIcon name="folder" size={52} color="#d1d5db" />
              </div>
              <p style={{ color: '#9ca3af', marginBottom: 16 }}>
                {search || filterStart ? 'No entries match your filters.' : 'No R&D entries logged yet.'}
              </p>
              {!search && !filterStart && (
                <button className="btn btn-primary btn-sm" onClick={onNewEntry}>
                  Log Your First Entry
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Code</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Pick #</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Received</th>
                    <th>Remark</th>
                    <th>Submitted By</th>
                    <th>Submitted At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr key={e.id} style={{ background: e.submittedBy === user?.fullName ? '#f0f9ff' : '' }}>
                      <td style={{ color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <span style={{
                          background: '#eff6ff', color: '#2563eb',
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
                        }}>{e.code}</span>
                      </td>
                      <td style={{ fontSize: 13, color: '#374151', maxWidth: 200 }}>{e.description}</td>
                      <td>
                        <span style={{
                          background: '#f3f4f6', color: '#6b7280',
                          padding: '2px 8px', borderRadius: 6,
                          fontSize: 12, fontWeight: 500,
                        }}>{e.category}</span>
                      </td>
                      <td style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                        {e.pickNumber || <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td><StatusBadge value={e.acceptReject} /></td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                        {e.receivedCount ?? 0}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 180 }}>
                        {e.remark || <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500, color: e.submittedBy === user?.fullName ? '#2563eb' : '#374151' }}>
                        {e.submittedBy === user?.fullName ? '👤 You' : e.submittedBy}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—'}
                      </td>
                      <td>
                        <button
                          className="btn-icon"
                          title="Delete Entry"
                          onClick={() => handleDelete(e)}
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                        >
                          <GlassIcon name="trash" size={15} color="#ef4444" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Product Catalog Modal */}
      {showCatalog && (
        <Overlay onClose={() => setShowCatalog(false)}>
          <div className="card" style={{
            width: 700, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            padding: 32, borderRadius: 16, boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>R&D Product Catalog</h3>
              <button
                onClick={() => setShowCatalog(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingCatalog ? (
                <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner"></span></div>
              ) : catalog.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>No products defined yet.</p>
              ) : (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb' }}>Code</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb' }}>Description</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb' }}>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map(p => (
                      <tr key={p.id} style={{ opacity: p.status === 'Inactive' ? 0.6 : 1, borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2563eb' }}>{p.code}</td>
                        <td style={{ padding: '10px 12px', color: '#374151' }}>{p.description}</td>
                        <td style={{ padding: '10px 12px', color: '#6b7280' }}>{p.category}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setShowCatalog(false)}>Close</button>
            </div>
          </div>
        </Overlay>
      )}

    </div>
  );
}
