import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

export default function AdminRndData() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');

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

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    const params = {};
    if (filterStart && filterEnd) { 
      params.startDate = filterStart; 
      params.endDate = filterEnd; 
    }
    window.open(api.exportRndUrl(params), '_blank');
  };

  return (
    <div className="admin-view" style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>R&D Data</h2>
          <p className="text-muted text-sm">Review experimental logs and export reports.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <GlassIcon name="export" size={14} color="#374151" /> Excel Export
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <GlassIcon name="search" size={16} color="#6b7280" />
          <span className="text-muted text-sm" style={{ marginRight: 8 }}>Filter by Date:</span>
          <input 
            type="date" 
            value={filterStart} 
            onChange={e => setFilterStart(e.target.value)} 
            style={{ width: 140, fontSize: 13 }} 
          />
          <span className="text-muted text-sm">to</span>
          <input 
            type="date" 
            value={filterEnd} 
            onChange={e => setFilterEnd(e.target.value)} 
            style={{ width: 140, fontSize: 13 }} 
          />
          
          {(filterStart || filterEnd) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStart(''); setFilterEnd(''); }}>
              Clear
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={load} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <GlassIcon name="search" size={13} color="#fff" /> Apply Filter
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GlassIcon name="settings" size={18} color="#2563eb" />
          <h3 style={{ margin: 0 }}>Logged R&D Entries</h3>
          <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{entries.length} entries</span>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
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
                  <th>Product Code</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Submitted At</th>
                  <th>Submitted By</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
                    <td><span className="badge badge-info" style={{ fontWeight: 700 }}>{e.code}</span></td>
                    <td style={{ fontSize: 13 }}>{e.description}</td>
                    <td style={{ fontSize: 13 }}>{e.category}</td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {e.submittedAt ? new Date(e.submittedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{e.submittedBy}</td>
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
