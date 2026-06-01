import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

export default function AdminReturnData() {
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [moSearch, setMoSearch]     = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (moSearch) params.moNumber = moSearch;
      if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
      const data = await api.getReturns(params);
      setEntries(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [moSearch, filterStart, filterEnd]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const fullMOs   = entries.filter(e => e.isFullMO);
  const compRets  = entries.filter(e => !e.isFullMO);
  const compBreak = ['Battery','PCBA','Coil','Shell'].reduce((acc, c) => {
    const ces = compRets.filter(e => e.component === c);
    acc[c] = { count: ces.length, totalQty: ces.reduce((s, e) => s + (e.componentQty || 0), 0) };
    return acc;
  }, {});

  const COMP_COLORS = { Battery:'#2563eb', PCBA:'#16a34a', Coil:'#7c3aed', Shell:'#d97706' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Return Data</h2>
          <p className="text-muted text-sm">Full MO returns and component-level returns with pending re-entry status.</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <div className="card" style={{ padding: '14px 16px', gridColumn: 'span 2' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="plan" size={14} color="#dc2626" /> Full MO Returns
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>{fullMOs.length}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>MOs fully returned</div>
        </div>
        {['Battery','PCBA','Coil','Shell'].map(c => (
          <div key={c} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: COMP_COLORS[c], marginBottom: 6 }}>{c} Returns</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: COMP_COLORS[c] }}>{compBreak[c].count}</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>QTY: {compBreak[c].totalQty.toLocaleString()}</div>
          </div>
        ))}
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
          <span className="text-muted text-sm">Date range:</span>
          <input type="datetime-local" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ width: 190, fontSize: 13 }} />
          <span className="text-muted text-sm">→</span>
          <input type="datetime-local" value={filterEnd}   onChange={e => setFilterEnd(e.target.value)}   style={{ width: 190, fontSize: 13 }} />
          {(moSearch || filterStart || filterEnd) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setMoSearch(''); setFilterStart(''); setFilterEnd(''); }}>
              Clear
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
          <GlassIcon name="history" size={18} color="#dc2626" />
          <h3 style={{ margin: 0 }}>All Return Records</h3>
          <span className="text-sm text-muted" style={{ marginLeft: 8 }}>{entries.length} entries</span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
        ) : entries.length === 0 ? (
          <div className="empty-state"><div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="arrow-left" size={48} color="#9ca3af" /></div><p>No return records found.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>MO Number</th>
                  <th>SKU</th>
                  <th>Return Type</th>
                  <th>Component</th>
                  <th>Component QTY</th>
                  <th>Full MO?</th>
                  <th>Status</th>
                  <th>Returned At</th>
                  <th>Replenished At</th>
                  <th>Submitted By</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, idx) => (
                  <tr key={e.id}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: '#dc2626' }}>{e.moNumber || '—'}</td>
                    <td><span className="badge badge-primary">{e.sku || '—'}</span></td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontSize: 12,
                        color: e.isFullMO ? '#dc2626' : '#7c3aed',
                        background: e.isFullMO ? '#fff1f2' : '#fdf4ff',
                        padding: '2px 10px', borderRadius: 20
                      }}>
                        {e.returnType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: COMP_COLORS[e.component] || '#374151', fontSize: 13 }}>
                      {e.isFullMO ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 500, color: '#4b5563', whiteSpace: 'nowrap' }}>
                          <div><span style={{color: COMP_COLORS.Battery}}>Battery:</span> {e.moDetails?.battery || '—'}</div>
                          <div><span style={{color: COMP_COLORS.PCBA}}>PCBA:</span> {e.moDetails?.pcba || '—'}</div>
                          <div><span style={{color: COMP_COLORS.Coil}}>Coil:</span> {e.moDetails?.coil || '—'}</div>
                          <div><span style={{color: COMP_COLORS.Shell}}>Shell:</span> {e.moDetails?.shell || '—'}</div>
                        </div>
                      ) : e.component || '—'}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {e.isFullMO ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          <div style={{ color: COMP_COLORS.Battery }}>× {e.moDetails?.batteryQty ?? e.moDetails?.qty ?? '—'}</div>
                          <div style={{ color: COMP_COLORS.PCBA }}>× {e.moDetails?.pcbaQty ?? e.moDetails?.qty ?? '—'}</div>
                          <div style={{ color: COMP_COLORS.Coil }}>× {e.moDetails?.coilQty ?? e.moDetails?.qty ?? '—'}</div>
                          <div style={{ color: COMP_COLORS.Shell }}>× {e.moDetails?.shellQty ?? e.moDetails?.qty ?? '—'}</div>
                        </div>
                      ) : (e.componentQty || 0).toLocaleString()}
                    </td>
                    <td>
                      {e.isFullMO
                        ? <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>Yes — Full MO</span>
                        : <span className="badge" style={{ background: '#f0fdf4', color: '#166534' }}>Component Only</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${e.status === 'Replenished' ? 'badge-success' : e.status === 'Returned' ? 'badge-danger' : 'badge-warning'}`}>
                        {e.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {e.returnedAt ? new Date(e.returnedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {e.replenishedAt ? new Date(e.replenishedAt).toLocaleString() : '—'}
                    </td>
                    <td style={{ fontSize: 12, fontWeight: 500 }}>{e.submittedBy}</td>
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
