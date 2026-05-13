import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

const COMPONENTS = ['Battery', 'PCBA', 'Coil', 'Shell'];
const COMP_COLORS = { Battery: '#2563eb', PCBA: '#16a34a', Coil: '#7c3aed', Shell: '#d97706' };

export default function AdminScrapData() {
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [moSearch, setMoSearch]   = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd]   = useState('');
  const [filterComp, setFilterComp] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (moSearch)  params.moNumber = moSearch;
      if (filterDate) params.date = filterDate;
      if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
      if (filterComp) params.component = filterComp;
      const data = await api.getScrap(params);
      setEntries(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [moSearch, filterDate, filterStart, filterEnd, filterComp]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const params = {};
    if (moSearch)  params.moNumber = moSearch;
    if (filterDate) params.date = filterDate;
    if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
    if (filterComp) params.component = filterComp;
    window.open(api.exportScrapUrl(params), '_blank');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this scrap record?')) return;
    try {
      await api.deleteScrap(id);
      load();
    } catch (e) {
      console.error(e);
      alert(e.message || 'Failed to delete record');
    }
  };

  // Summary per component
  const summary = COMPONENTS.reduce((acc, c) => {
    const ces = entries.filter(e => e.component === c);
    acc[c] = {
      totalRC:  ces.reduce((s, e) => s + (e.receive || 0), 0),
      totalRJ:  ces.reduce((s, e) => s + (e.reject  || 0), 0),
      count:    ces.length,
    };
    return acc;
  }, {});

  const totalRC = entries.reduce((s, e) => s + (e.receive || 0), 0);
  const totalRJ = entries.reduce((s, e) => s + (e.reject  || 0), 0);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Scrap Data</h2>
          <p className="text-muted text-sm">Full scrap records — receive (RC) &amp; reject (RJ) per component, per MO.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GlassIcon name="export" size={14} color="#374151" /> Excel Export
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {COMPONENTS.map(c => {
          const s = summary[c];
          const col = COMP_COLORS[c];
          return (
            <div key={c} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: col, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <GlassIcon name={c === 'Battery' ? 'database' : c === 'PCBA' ? 'card' : c === 'Coil' ? 'shield' : 'plan'} size={14} color={col} />
                {c}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ textAlign: 'center', background: '#f0fdf4', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>{s.totalRC}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>RC</div>
                </div>
                <div style={{ textAlign: 'center', background: '#fff1f2', borderRadius: 8, padding: '8px 4px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{s.totalRJ}</div>
                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>RJ</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>{s.count} records</div>
            </div>
          );
        })}
      </div>

      {/* Total summary bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 32, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassIcon name="database" size={16} color="#6b7280" />
          <span className="text-sm text-muted">Total Records: <strong>{entries.length}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
          <span className="text-sm">Total RC: <strong style={{ color: '#16a34a' }}>{totalRC.toLocaleString()}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          <span className="text-sm">Total RJ: <strong style={{ color: '#dc2626' }}>{totalRJ.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <GlassIcon name="search" size={16} color="#6b7280" />
          <input
            placeholder="Search MO number (or last 3–4 digits)"
            value={moSearch}
            onChange={e => setMoSearch(e.target.value)}
            style={{ width: 240, fontSize: 13 }}
          />
          <input type="date" value={filterDate}  onChange={e => { setFilterDate(e.target.value); setFilterStart(''); setFilterEnd(''); }} style={{ width: 145, fontSize: 13 }} title="Exact Date" />
          <span className="text-muted text-sm">or time range:</span>
          <input type="datetime-local" value={filterStart} onChange={e => { setFilterStart(e.target.value); setFilterDate(''); }} style={{ width: 200, fontSize: 13 }} />
          <span className="text-muted text-sm">→</span>
          <input type="datetime-local" value={filterEnd}   onChange={e => { setFilterEnd(e.target.value); setFilterDate(''); }} style={{ width: 200, fontSize: 13 }} />
          <select value={filterComp} onChange={e => setFilterComp(e.target.value)} style={{ width: 120, fontSize: 13 }}>
            <option value="">All Components</option>
            {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(moSearch || filterDate || filterStart || filterEnd || filterComp) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setMoSearch(''); setFilterDate(''); setFilterStart(''); setFilterEnd(''); setFilterComp(''); }}>
              Clear All
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={load} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <GlassIcon name="search" size={13} color="#fff" /> Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassIcon name="scrap" size={18} color="#dc2626" />
          <h3 style={{ margin: 0 }}>All Scrap Records</h3>
          <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{entries.length} entries</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
        ) : entries.length === 0 ? (
          <div className="empty-state"><div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="folder" size={48} color="#9ca3af" /></div><p>No scrap records found.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>MO Number</th>
                  <th>SKU</th>
                  <th>Component</th>
                  <th>Component Name</th>
                  <th style={{ color: '#16a34a' }}>RC (Receive)</th>
                  <th style={{ color: '#dc2626' }}>RJ (Reject)</th>
                  <th>Received At</th>
                  <th>Rejected At</th>
                  <th>Submitted</th>
                  <th>Submitted By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#dc2626' }}>{e.moNumber || '—'}</td>
                    <td><span className="badge badge-primary">{e.sku || '—'}</span></td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 12, color: COMP_COLORS[e.component] || '#374151' }}>
                        {e.component}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#374151', maxWidth: 200 }}>{e.componentName}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 12px', borderRadius: 20 }}>
                        {e.receive}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#dc2626', background: '#fff1f2', padding: '3px 12px', borderRadius: 20 }}>
                        {e.reject}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {e.receivedAt ? new Date(e.receivedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {e.rejectedAt ? new Date(e.rejectedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 500 }}>{e.submittedBy}</td>
                    <td>
                      <button className="btn-icon" title="Delete Record" onClick={() => handleDelete(e.id)} style={{ color: '#dc2626' }}>
                        <GlassIcon name="delete" size={16} color="#dc2626" />
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
  );
}
