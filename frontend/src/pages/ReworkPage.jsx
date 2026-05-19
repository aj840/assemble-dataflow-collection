import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';
import ModalPortal from '../components/ModalPortal';

const COMPONENTS = ['PCBA', 'Battery', 'Coil', 'Shell', 'Lens'];
const COMP_COLORS = { Battery: '#2563eb', PCBA: '#16a34a', Coil: '#7c3aed', Shell: '#d97706', Lens: '#e67e22' };

export default function ReworkPage({ onBack }) {
  const { user } = useAuth();

  // MO list state
  const [mos, setMos] = useState([]);
  const [moSearch, setMoSearch] = useState('');
  const [selectedMOs, setSelectedMOs] = useState([]);
  const [mosLoading, setMosLoading] = useState(true);

  // Rework entry state
  const [reworkEntries, setReworkEntries] = useState([]);
  const [rewLoading, setRewLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterComp, setFilterComp] = useState('');
  const [reworkSearch, setReworkSearch] = useState('');

  // Entry modal
  const [entryModal, setEntryModal] = useState(false);
  const [activeComp, setActiveComp] = useState('');
  const [activeCompName, setActiveCompName] = useState('');
  const [recvQty, setRecvQty] = useState('');
  const [rejQty, setRejQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entryError, setEntryError] = useState('');
  const [isFullMO, setIsFullMO] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editingRework, setEditingRework] = useState(null);
  const [editRecvQty, setEditRecvQty] = useState('');
  const [editRejQty, setEditRejQty] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Load MOs (Only Completed)
  const loadMOs = useCallback(async () => {
    setMosLoading(true);
    try {
      const data = await api.getMOs({ status: 'Completed' });
      setMos(data);
    } catch (e) { console.error(e); }
    finally { setMosLoading(false); }
  }, []);

  // Load rework entries
  const loadRework = useCallback(async () => {
    setRewLoading(true);
    try {
      const params = {};
      if (reworkSearch) params.moNumber = reworkSearch;
      if (filterDate) params.date = filterDate;
      if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
      if (filterComp) params.component = filterComp;
      const data = await api.getRework(params);
      setReworkEntries(data);
    } catch (e) { console.error(e); }
    finally { setRewLoading(false); }
  }, [reworkSearch, filterDate, filterStart, filterEnd, filterComp]);

  useEffect(() => {
    const t = setTimeout(() => loadMOs(), 0);
    return () => clearTimeout(t);
  }, [loadMOs]);
  useEffect(() => {
    const t = setTimeout(() => loadRework(), 0);
    return () => clearTimeout(t);
  }, [reworkSearch, filterDate, filterStart, filterEnd, filterComp, loadRework]);

  // Filtered MO list
  const filteredMOs = mos.filter(mo => {
    if (!moSearch) return true;
    const q = moSearch.toLowerCase();
    const moNum = (mo.moNumber || '').toLowerCase();
    const last4 = moNum.slice(-4);
    const last3 = moNum.slice(-3);
    return moNum.includes(q) || last4.includes(q) || last3.includes(q);
  });

  const openEntryModal = (comp, compName, fullMO = false) => {
    setActiveComp(comp);
    setActiveCompName(compName);
    setIsFullMO(fullMO);
    setRecvQty('');
    setRejQty('');
    setEntryError('');
    setEntryModal(true);
  };

  const submitEntry = async () => {
    if (selectedMOs.length === 0) { setEntryError('Please select at least one MO.'); return; }
    
    const rj = parseInt(rejQty || 0);
    const rc = parseInt(recvQty || 0);

    if (rj <= 0 && rc <= 0) { setEntryError('At least one of Reject or Receive quantity must be greater than 0.'); return; }
    
    setSubmitting(true);
    setEntryError('');
    try {
      if (isFullMO) {
        // Log for all active components (PR: PCBA/Battery/Shell/Lens; others: PCBA/Battery/Coil/Shell)
        await Promise.all(selectedMOs.map(mo => {
          const comps = [
            { c: 'Battery', n: mo.battery },
            { c: 'PCBA',    n: mo.pcba    },
            ...(mo.isProRing ? [] : [{ c: 'Coil', n: mo.coil }]),
            { c: 'Shell',   n: mo.shell   },
            ...(mo.isProRing && mo.lens && mo.lens !== 'N/A' ? [{ c: 'Lens', n: mo.lens }] : []),
          ];
          return Promise.all(comps.map(comp =>
            api.createRework({
              moId: mo.id, moNumber: mo.moNumber, sku: mo.sku,
              component: comp.c, componentName: comp.n || '—',
              receive: rc, reject: rj, isFullMO: true,
              submittedBy: user?.fullName || user?.employeeId || 'User'
            })
          ));
        }));
      } else {
        await Promise.all(selectedMOs.map(mo => 
          api.createRework({
            moId: mo.id, moNumber: mo.moNumber, sku: mo.sku,
            component: activeComp, componentName: activeCompName,
            receive: rc, reject: rj, isFullMO: false,
            submittedBy: user?.fullName || user?.employeeId || 'User'
          })
        ));
      }
      setEntryModal(false);
      loadRework();
    } catch (e) { setEntryError(e.message || 'Failed to submit rework entry.'); }
    finally { setSubmitting(false); }
  };

  const openEditModal = (rework) => {
    setEditingRework(rework);
    setEditRecvQty(rework.receive || '');
    setEditRejQty(rework.reject || '');
    setEditModal(true);
    setEntryError('');
  };

  const submitEdit = async () => {
    const rj = parseInt(editRejQty || 0);
    const rc = parseInt(editRecvQty || 0);

    if (rj <= 0 && rc <= 0) { setEntryError('At least one of Reject or Receive quantity must be greater than 0.'); return; }

    setEditSubmitting(true);
    setEntryError('');
    try {
      await api.updateRework(editingRework.id, {
        receive: rc,
        reject: rj,
        submittedBy: user?.fullName || user?.employeeId || 'User'
      });
      setEditModal(false);
      loadRework();
    } catch (e) {
      setEntryError(e.message || 'Failed to update rework entry.');
    } finally {
      setEditSubmitting(false);
    }
  };
  
  const handleDelete = async (id) => {
      if(!window.confirm('Are you sure you want to delete this rework record?')) return;
      try {
          await api.deleteRework(id);
          loadRework();
      } catch (e) {
          console.error(e);
          alert('Failed to delete rework record.');
      }
  }

  // Component card data from selected MO — conditionally show Lens for PR MOs
  const getCompCards = () => {
    if (selectedMOs.length === 0) return [];
    const refMO = selectedMOs[0];
    const cards = [
      { comp: 'PCBA',    name: refMO.pcba    || '—', qty: refMO.pcbaComp    || refMO.qty, color: '#16a34a', bg: '#f0fdf4', icon: 'card'     },
      { comp: 'Battery', name: refMO.battery || '—', qty: refMO.batteryComp || refMO.qty, color: '#2563eb', bg: '#eff6ff', icon: 'database' },
      ...(!refMO.isProRing ? [{ comp: 'Coil', name: refMO.coil || '—', qty: refMO.coilComp || refMO.qty, color: '#7c3aed', bg: '#fdf4ff', icon: 'shield' }] : []),
      { comp: 'Shell',   name: refMO.shell   || '—', qty: refMO.shellComp   || refMO.qty, color: '#d97706', bg: '#fffbeb', icon: 'plan'     },
      ...(refMO.isProRing && refMO.lens && refMO.lens !== 'N/A' ? [{ comp: 'Lens', name: refMO.lens, qty: refMO.lensComp || 0, color: '#e67e22', bg: '#fff7ed', icon: 'shield' }] : []),
    ];
    return cards;
  };

  const handleExport = () => {
    const params = {};
    if (reworkSearch) params.moNumber = reworkSearch;
    if (filterDate) params.date = filterDate;
    if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
    if (filterComp) params.component = filterComp;
    window.open(api.exportReworkUrl(params), '_blank');
  };

  // Summary totals per component from rework entries
  const summaryByComp = COMPONENTS.reduce((acc, c) => {
    const entries = reworkEntries.filter(e => e.component === c);
    acc[c] = {
      totalReceive: entries.reduce((s, e) => s + (e.receive || 0), 0),
      totalReject:  entries.reduce((s, e) => s + (e.reject  || 0), 0),
      count: entries.length,
    };
    return acc;
  }, {});

  const allSummaryComps = [...new Set(['PCBA', 'Battery', 'Coil', 'Shell', 'Lens', ...reworkEntries.map(e => e.component).filter(Boolean)])];

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo">◇</div>UltraHuman Assembly</div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span>›</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>Rework</span>
          </div>
        </div>
        <div className="navbar-right">
          <div className="user-chip">
            <div style={{ position: 'relative' }}>
              <div className="user-avatar">{user?.fullName?.[0]}</div>
              <div className="online-dot" />
            </div>
            <div className="user-info-text">
              <div className="name">{user?.fullName}</div>
              <div className="role">Rework Entry</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="export" size={14} color="#374151" /> Excel Export
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT — MO List Panel (COMPLETED MOs) */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlassIcon name="history" size={18} color="#2563eb" />
                <h3 style={{ margin: 0 }}>Completed MOs</h3>
              </div>
              <div className="card-body">
                {/* Search */}
                <div style={{ marginBottom: 12, position: 'relative' }}>
                  <GlassIcon name="search" size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    placeholder="Search MO or last 3-4 digits…"
                    value={moSearch}
                    onChange={e => setMoSearch(e.target.value)}
                    style={{ paddingLeft: 32, width: '100%' }}
                  />
                </div>
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {mosLoading ? (
                    <div style={{ textAlign: 'center', padding: 24 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
                  ) : filteredMOs.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px 0' }}>
                      <div className="icon" style={{ display: 'flex', justifyContent: 'center' }}><GlassIcon name="document" size={40} color="#9ca3af" /></div>
                      <p>No completed MOs found.</p>
                    </div>
                  ) : filteredMOs.map(mo => {
                    const isSelected = selectedMOs.some(m => m.id === mo.id);
                    return (
                      <div
                        key={mo.id}
                        onClick={() => {
                          if (isSelected) setSelectedMOs([]);
                          else setSelectedMOs([mo]);
                        }}
                        style={{
                          padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                          border: isSelected ? '2px solid #2563eb' : '1.5px solid #e5e7eb',
                          background: isSelected ? '#eff6ff' : '#f9fafb',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#1e40af', fontSize: 13 }}>{mo.moNumber || '—'}</span>
                          <span className="badge badge-success">Completed</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                          <span className="badge badge-primary" style={{ fontSize: 11 }}>{mo.sku}</span>
                          <span style={{ marginLeft: 8 }}>QTY: <strong>{(mo.qty || 0).toLocaleString()}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Main Panel */}
          <div>
            {/* Global Date Filters */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: '#fff', border: '1px solid #e5e7eb', padding: '6px 12px', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#4b5563', marginRight: 4 }}>Filter Date:</span>
                <input 
                  type="date" 
                  value={filterDate} 
                  onChange={e => { setFilterDate(e.target.value); setFilterStart(''); setFilterEnd(''); }} 
                  style={{ border: 'none', background: '#f9fafb', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#4b5563', outline: 'none', cursor: 'pointer' }} 
                />
                <span style={{ fontSize: 13, color: '#9ca3af', margin: '0 4px' }}>OR</span>
                <input 
                  type="date" 
                  value={filterStart} 
                  onChange={e => { setFilterStart(e.target.value); setFilterDate(''); }} 
                  style={{ border: 'none', background: '#f9fafb', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#4b5563', outline: 'none', cursor: 'pointer' }} 
                />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                <input 
                  type="date" 
                  value={filterEnd} 
                  onChange={e => { setFilterEnd(e.target.value); setFilterDate(''); }} 
                  style={{ border: 'none', background: '#f9fafb', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#4b5563', outline: 'none', cursor: 'pointer' }} 
                />
                {(filterDate || filterStart || filterEnd) && (
                  <button 
                    className="btn btn-sm" 
                    onClick={() => { setFilterDate(''); setFilterStart(''); setFilterEnd(''); }}
                    style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '4px 8px', marginLeft: 8 }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {selectedMOs.length === 0 ? (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="empty-state" style={{ padding: '40px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="arrow-left" size={40} color="#9ca3af" /></div>
                  <h3 style={{ marginBottom: 8 }}>Select MO</h3>
                  <p className="text-muted">Choose a Completed Manufacturing Order from the left panel to start entering rework data.</p>
                </div>
              </div>
            ) : (
              /* Selected MO Info */
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <GlassIcon name="plan" size={18} color="#2563eb" />
                    <div>
                      <h3 style={{ margin: 0 }}>Selected MO ({selectedMOs[0].moNumber})</h3>
                    </div>
                  </div>
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => openEntryModal('Full MO', selectedMOs[0].sku, true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none' }}
                  >
                    <GlassIcon name="refresh" size={14} color="#fff" /> Full MO Rework
                  </button>
                </div>
                <div className="card-body">
                  <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Select a component below to enter Rework Reject / Receive data:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                    {getCompCards().map(c => (
                      <div
                        key={c.comp}
                        onClick={() => openEntryModal(c.comp, c.name, false)}
                        style={{
                          background: c.bg, border: `2px solid ${c.color}30`, borderRadius: 12,
                          padding: '16px 12px', textAlign: 'center', cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${c.color}25`; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                      >
                        <GlassIcon name={c.icon} size={24} color={c.color} style={{ marginBottom: 8 }} />
                        <div style={{ fontWeight: 700, color: c.color, fontSize: 13, marginBottom: 4 }}>{c.comp}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, lineHeight: 1.3 }}>{c.name}</div>
                        <div style={{ marginTop: 10 }}>
                          <span style={{ display: 'inline-block', background: '#fff', border: `1.5px solid ${c.color}`, color: c.color, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                            + Enter Rework
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
              {allSummaryComps.filter(c => c && summaryByComp[c]?.count > 0 || ['PCBA','Battery','Coil','Shell'].includes(c)).map(c => {
                const s = summaryByComp[c] || { totalReceive: 0, totalReject: 0, count: 0 };
                const col = COMP_COLORS[c] || '#6b7280';
                return (
                  <div key={c} className="card" style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: col, marginBottom: 8 }}>{c}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{s.totalReceive}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>RC (Recv)</div>
                      </div>
                      <div style={{ flex: 1, textAlign: 'center', background: '#fff1f2', borderRadius: 8, padding: '6px 4px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{s.totalReject}</div>
                        <div style={{ fontSize: 10, color: '#6b7280' }}>RJ (Sent)</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>{s.count} records</div>
                  </div>
                );
              })}
            </div>

            {/* Rework Records Table */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="history" size={16} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Rework Records</h3>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: 180 }}>
                    <GlassIcon name="search" size={12} color="#9ca3af" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                      placeholder="Search MO..." 
                      value={reworkSearch} 
                      onChange={e => setReworkSearch(e.target.value)} 
                      style={{ paddingLeft: 26, fontSize: 12, width: '100%' }}
                    />
                  </div>
                  <select value={filterComp} onChange={e => setFilterComp(e.target.value)} style={{ width: 110, fontSize: 12 }}>
                    <option value="">All Parts</option>
                    {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {filterComp && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setFilterComp('')}>Clear</button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={loadRework} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <GlassIcon name="search" size={12} color="#374151" /> Refresh
                  </button>
                </div>
              </div>
              {rewLoading ? (
                <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
              ) : reworkEntries.length === 0 ? (
                <div className="empty-state">
                  <div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="folder" size={48} color="#9ca3af" /></div>
                  <p>No rework records found.</p>
                </div>
              ) : (
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table style={{ minWidth: 800 }}>
                    <thead>
                      <tr>
                        <th>MO Number</th>
                        <th>SKU</th>
                        <th>Component</th>
                        <th>Component Name</th>
                        <th style={{ color: '#16a34a' }}>Receive (RC)</th>
                        <th style={{ color: '#dc2626' }}>Reject (RJ)</th>
                        <th>Received At</th>
                        <th>Rejected At</th>
                        <th>Submitted By</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reworkEntries.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 700, color: '#1e40af' }}>{e.moNumber}</td>
                          <td><span className="badge badge-primary">{e.sku}</span></td>
                          <td>
                            <span style={{ fontWeight: 600, color: COMP_COLORS[e.component] || '#6b7280' }}>
                              {e.component}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#374151' }}>{e.componentName}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 10px', borderRadius: 20, fontSize: 13 }}>
                              {e.receive}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#dc2626', background: '#fff1f2', padding: '2px 10px', borderRadius: 20, fontSize: 13 }}>
                              {e.reject}
                            </span>
                          </td>
                          <td style={{ fontSize: 11, color: '#6b7280' }}>{e.receivedAt ? new Date(e.receivedAt).toLocaleString() : '—'}</td>
                          <td style={{ fontSize: 11, color: '#6b7280' }}>{e.rejectedAt ? new Date(e.rejectedAt).toLocaleString() : '—'}</td>
                          <td style={{ fontSize: 12 }}>{e.submittedBy}</td>
                          <td>
                            <div className="td-actions">
                              <button className="btn-icon" title="Edit" onClick={() => openEditModal(e)}>
                                <GlassIcon name="edit" size={18} color="#2563eb" />
                              </button>
                              <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(e.id)}>
                                <GlassIcon name="delete" size={18} color="#dc2626" />
                              </button>
                            </div>
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
      </div>

      {/* Entry Modal */}
      {entryModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEntryModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="history" size={20} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Rework Entry — {activeComp}</h3>
                </div>
                <button className="btn-icon" onClick={() => setEntryModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>MO: {selectedMOs[0]?.moNumber}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{activeComp}: <strong>{activeCompName}</strong></div>
                  {isFullMO && <div style={{ marginTop: 4, display: 'inline-block', background: '#dbeafe', color: '#1d4ed8', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Will apply to all 4 components</div>}
                </div>
                {entryError && <div className="alert alert-danger" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {entryError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}><GlassIcon name="close" size={14} color="#dc2626" /> Reject (RJ)</label>
                    <input type="number" min="0" placeholder="Qty Sent to Rework" value={rejQty} onChange={e => setRejQty(e.target.value)} style={{ borderColor: '#fca5a5' }} />
                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>Qty sent to rework</p>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}><GlassIcon name="success" size={14} color="#16a34a" /> Receive (RC)</label>
                    <input type="number" min="0" placeholder="Qty Received Back" value={recvQty} onChange={e => setRecvQty(e.target.value)} style={{ borderColor: '#86efac' }} />
                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>Qty received back</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEntryModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={submitEntry}
                  disabled={submitting}
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none' }}
                >
                  {submitting ? 'Saving…' : <><GlassIcon name="success" size={14} color="#fff" /> Submit Rework</>}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit Rework Modal */}
      {editModal && editingRework && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEditModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="edit" size={20} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Edit Rework Record</h3>
                </div>
                <button className="btn-icon" onClick={() => setEditModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>MO: {editingRework.moNumber}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{editingRework.component}: <strong>{editingRework.componentName}</strong></div>
                </div>
                {entryError && <div className="alert alert-danger" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {entryError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}><GlassIcon name="close" size={14} color="#dc2626" /> Reject (RJ)</label>
                    <input type="number" min="0" placeholder="Qty Sent" value={editRejQty} onChange={e => setEditRejQty(e.target.value)} style={{ borderColor: '#fca5a5' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}><GlassIcon name="success" size={14} color="#16a34a" /> Receive (RC)</label>
                    <input type="number" min="0" placeholder="Qty Received" value={editRecvQty} onChange={e => setEditRecvQty(e.target.value)} style={{ borderColor: '#86efac' }} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitEdit} disabled={editSubmitting}>
                  {editSubmitting ? 'Saving…' : <><GlassIcon name="save" size={14} /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
