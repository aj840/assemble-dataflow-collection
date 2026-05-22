import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import GlassIcon from '../components/GlassIcon';
import { api } from '../services/api';

export default function RndDashboard({ onBack, onNewEntry }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRnd();
      setEntries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = entries.filter(e =>
    !search ||
    e.code?.toLowerCase().includes(search.toLowerCase()) ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.category?.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const totalEntries = entries.length;
  const myEntries = entries.filter(e => e.submittedBy === user?.fullName).length;
  const uniqueCodes = [...new Set(entries.map(e => e.code))].length;
  const uniqueCategories = [...new Set(entries.map(e => e.category))].length;

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

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>R&D Dashboard</h1>
          <p className="text-muted">View all logged experimental product entries and track R&D progress.</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Entries', value: totalEntries, color: '#2563eb', icon: 'database' },
            { label: 'My Entries', value: myEntries, color: '#16a34a', icon: 'plan' },
            { label: 'Product Codes', value: uniqueCodes, color: '#7c3aed', icon: 'card' },
            { label: 'Categories', value: uniqueCategories, color: '#d97706', icon: 'shield' },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: stat.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GlassIcon name={stat.icon} size={22} color={stat.color} />
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search / Filter Bar */}
        <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <GlassIcon name="search" size={16} color="#6b7280" />
          <input
            className="input-field"
            placeholder="Search by code, description or category..."
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
              <p className="text-muted" style={{ marginTop: 12 }}>Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <GlassIcon name="folder" size={52} color="#d1d5db" />
              </div>
              <p style={{ color: '#9ca3af', marginBottom: 16 }}>
                {search ? 'No entries match your search.' : 'No R&D entries logged yet.'}
              </p>
              {!search && (
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
                    <th>Submitted By</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr key={e.id} style={{ background: e.submittedBy === user?.fullName ? '#f0f9ff' : '' }}>
                      <td style={{ color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
                      <td>
                        <span style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 13,
                          fontWeight: 700,
                          letterSpacing: 0.5,
                        }}>{e.code}</span>
                      </td>
                      <td style={{ fontSize: 13, color: '#374151' }}>{e.description}</td>
                      <td>
                        <span style={{
                          background: '#f3f4f6',
                          color: '#6b7280',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                        }}>{e.category}</span>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 500, color: e.submittedBy === user?.fullName ? '#2563eb' : '#374151' }}>
                        {e.submittedBy === user?.fullName ? '👤 You' : e.submittedBy}
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
