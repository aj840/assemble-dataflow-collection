import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import GlassIcon from '../components/GlassIcon';
import ModalPortal from '../components/ModalPortal';

const COMPONENTS = ['PCBA', 'Battery', 'Coil', 'Shell', 'Lens'];
const COMP_COLORS = { Battery: '#2563eb', PCBA: '#16a34a', Coil: '#7c3aed', Shell: '#d97706', Lens: '#e67e22' };

export default function ScrapPage({ onBack }) {
  const { user } = useAuth();

  // MO list state
  const [mos, setMos] = useState([]);
  const [moSearch, setMoSearch] = useState('');
  const [selectedMOs, setSelectedMOs] = useState([]);
  const [mosLoading, setMosLoading] = useState(true);

  // Scrap entry state
  const [scrapEntries, setScrapEntries] = useState([]);
  const [scrLoading, setScrLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterComp, setFilterComp] = useState('');
  const [scrapSearch, setScrapSearch] = useState('');

  // Entry modal
  const [entryModal, setEntryModal] = useState(false);
  const [activeComp, setActiveComp] = useState('');
  const [activeCompName, setActiveCompName] = useState('');
  const [recvQty, setRecvQty] = useState('');
  const [rejQty, setRejQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entryError, setEntryError] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editingScrap, setEditingScrap] = useState(null);
  const [editRecvQty, setEditRecvQty] = useState('');
  const [editRejQty, setEditRejQty] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Bulk delete
  const [selectedScrapIds, setSelectedScrapIds] = useState([]);

  const handleBulkDeleteScrap = async () => {
    if (selectedScrapIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedScrapIds.length} scrap record(s)?`)) return;
    setScrLoading(true);
    try {
      await Promise.all(selectedScrapIds.map(id => api.deleteScrap(id)));
      setSelectedScrapIds([]);
      loadScrap();
    } catch (e) {
      console.error(e);
      alert('Failed to delete some records.');
      setScrLoading(false);
    }
  };

  // Load MOs
  const loadMOs = useCallback(async () => {
    setMosLoading(true);
    try {
      const data = await api.getMOs({ status: 'Pending' });
      setMos(data);
    } catch (e) { console.error(e); }
    finally { setMosLoading(false); }
  }, []);

  // Load scrap entries
  const loadScrap = useCallback(async () => {
    setScrLoading(true);
    setSelectedScrapIds([]);
    try {
      const params = {};
      if (scrapSearch) params.moNumber = scrapSearch;
      if (filterDate) params.date = filterDate;
      if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
      if (filterComp) params.component = filterComp;
      const data = await api.getScrap(params);
      setScrapEntries(data);
    } catch (e) { console.error(e); }
    finally { setScrLoading(false); }
  }, [scrapSearch, filterDate, filterStart, filterEnd, filterComp]);

  useEffect(() => {
    const t = setTimeout(() => loadMOs(), 0);
    return () => clearTimeout(t);
  }, [loadMOs]);
  useEffect(() => {
    const t = setTimeout(() => loadScrap(), 0);
    return () => clearTimeout(t);
  }, [scrapSearch, filterDate, filterStart, filterEnd, filterComp, loadScrap]);

  // Filtered MO list
  const filteredMOs = mos.filter(mo => {
    if (!moSearch) return true;
    const q = moSearch.toLowerCase();
    const moNum = (mo.moNumber || '').toLowerCase();
    const last4 = moNum.slice(-4);
    const last3 = moNum.slice(-3);
    return moNum.includes(q) || last4.includes(q) || last3.includes(q);
  });

  const openEntryModal = (comp, compName) => {
    setActiveComp(comp);
    setActiveCompName(compName);
    setRecvQty('');
    setRejQty('');
    setEntryError('');
    setEntryModal(true);
  };

  const submitEntry = async () => {
    if (selectedMOs.length === 0) { setEntryError('Please select at least one MO.'); return; }
    
    const rj = parseInt(rejQty || 0);
    const rc = parseInt(recvQty || 0);

    if (rj <= 0) { setEntryError('Reject quantity must be greater than 0.'); return; }
    if (rc < 0 || (recvQty !== '' && rc === 0)) { setEntryError('Receive quantity must be greater than 0 if provided.'); return; }
    if (rc > rj) { setEntryError(`Receive quantity (${rc}) cannot exceed Reject quantity (${rj}).`); return; }

    setSubmitting(true);
    setEntryError('');
    try {
      await Promise.all(selectedMOs.map(mo => 
        api.createScrap({
          moId: mo.id,
          moNumber: mo.moNumber,
          sku: mo.sku,
          component: activeComp,
          componentName: activeCompName,
          receive: rc,
          reject: rj,
          submittedBy: user?.fullName || user?.employeeId || 'User'
        })
      ));
      setEntryModal(false);
      loadScrap();
    } catch (e) { setEntryError(e.message || 'Failed to submit scrap entry.'); }
    finally { setSubmitting(false); }
  };

  const openEditModal = (scrap) => {
    setEditingScrap(scrap);
    setEditRecvQty(scrap.receive || '');
    setEditRejQty(scrap.reject || '');
    setEditModal(true);
    setEntryError('');
  };

  const submitEdit = async () => {
    const rj = parseInt(editRejQty || 0);
    const rc = parseInt(editRecvQty || 0);

    if (rj <= 0) { setEntryError('Reject quantity must be greater than 0.'); return; }
    if (rc < 0 || (editRecvQty !== '' && rc === 0)) { setEntryError('Receive quantity must be greater than 0 if provided.'); return; }
    if (rc > rj) { setEntryError(`Receive quantity (${rc}) cannot exceed Reject quantity (${rj}).`); return; }

    setEditSubmitting(true);
    setEntryError('');
    try {
      await api.updateScrap(editingScrap.id, {
        receive: editRecvQty || 0,
        reject: editRejQty || 0,
        submittedBy: user?.fullName || user?.employeeId || 'User'
      });
      setEditModal(false);
      loadScrap();
    } catch (e) {
      setEntryError(e.message || 'Failed to update scrap entry.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Component card data — Lens shown for PR MOs, Coil hidden for PR MOs
  const getCompCards = () => {
    if (selectedMOs.length === 0) return [];
    const refMO = selectedMOs[0];
    return [
      { comp: 'PCBA',    name: refMO.pcba    || '—', qty: refMO.pcbaComp    || refMO.qty, color: '#16a34a', bg: '#f0fdf4', icon: 'card'     },
      { comp: 'Battery', name: refMO.battery || '—', qty: refMO.batteryComp || refMO.qty, color: '#2563eb', bg: '#eff6ff', icon: 'database' },
      ...(!refMO.isProRing ? [{ comp: 'Coil', name: refMO.coil || '—', qty: refMO.coilComp || refMO.qty, color: '#7c3aed', bg: '#fdf4ff', icon: 'shield' }] : []),
      { comp: 'Shell',   name: refMO.shell   || '—', qty: refMO.shellComp   || refMO.qty, color: '#d97706', bg: '#fffbeb', icon: 'plan'     },
      ...(refMO.isProRing && refMO.lens && refMO.lens !== 'N/A' ? [{ comp: 'Lens', name: refMO.lens, qty: refMO.lensComp || 0, color: '#e67e22', bg: '#fff7ed', icon: 'shield' }] : []),
    ];
  };

  const handleExport = () => {
    const params = {};
    if (moSearch) params.moNumber = moSearch;
    if (filterDate) params.date = filterDate;
    if (filterStart && filterEnd) { params.startDate = filterStart; params.endDate = filterEnd; }
    if (filterComp) params.component = filterComp;
    window.open(api.exportScrapUrl(params), '_blank');
  };

  // Summary totals per component from scrap entries
  const summaryByComp = COMPONENTS.reduce((acc, c) => {
    const entries = scrapEntries.filter(e => e.component === c);
    acc[c] = {
      totalReceive: entries.reduce((s, e) => s + (e.receive || 0), 0),
      totalReject:  entries.reduce((s, e) => s + (e.reject  || 0), 0),
      count: entries.length,
    };
    return acc;
  }, {});

  // All unique comp types seen in filtered entries (shows Lens if PR scrap was logged)
  const allSummaryComps = [...new Set(['PCBA', 'Battery', 'Coil', 'Shell', ...scrapEntries.map(e => e.component).filter(Boolean)])];
  if (scrapEntries.some(e => e.component === 'Lens')) allSummaryComps.includes('Lens') || allSummaryComps.push('Lens');

  return (
    <div style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="navbar-brand"><div className="navbar-logo">◇</div>UltraHuman Assembly</div>
          <div className="navbar-breadcrumb">
            <span style={{ cursor: 'pointer', color: '#6b7280' }} onClick={onBack}>Platform</span>
            <span>›</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>Scrap</span>
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
              <div className="role">Scrap Entry</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GlassIcon name="export" size={14} color="#374151" /> Excel Export
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 340px) 1fr', gap: 24, alignItems: 'start' }}>

          {/* LEFT — MO List Panel */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 20 }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlassIcon name="scrap" size={18} color="#dc2626" />
                <h3 style={{ margin: 0 }}>Pending MO Plans</h3>
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
                      <p>No MO plans found.</p>
                    </div>
                  ) : filteredMOs.map(mo => {
                    const isSelected = selectedMOs.some(m => m.id === mo.id);
                    return (
                      <div
                        key={mo.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMOs([]);
                          } else {
                            setSelectedMOs([mo]);
                          }
                        }}
                        style={{
                          padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                          border: isSelected ? '2px solid #dc2626' : '1.5px solid #e5e7eb',
                          background: isSelected ? '#fff1f2' : '#f9fafb',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: '#dc2626', fontSize: 13 }}>{mo.moNumber || '—'}</span>
                          <span className={`badge ${mo.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>{mo.status}</span>
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
                  title="Specific Date"
                />
                <span style={{ fontSize: 13, color: '#9ca3af', margin: '0 4px' }}>OR</span>
                <input 
                  type="datetime-local" 
                  value={filterStart} 
                  onChange={e => { setFilterStart(e.target.value); setFilterDate(''); }} 
                  style={{ border: 'none', background: '#f9fafb', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#4b5563', outline: 'none', cursor: 'pointer', width: 175 }} 
                  title="Start Date & Time"
                />
                <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
                <input 
                  type="datetime-local" 
                  value={filterEnd} 
                  onChange={e => { setFilterEnd(e.target.value); setFilterDate(''); }} 
                  style={{ border: 'none', background: '#f9fafb', padding: '4px 8px', borderRadius: 6, fontSize: 13, color: '#4b5563', outline: 'none', cursor: 'pointer', width: 175 }} 
                  title="End Date & Time"
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
                  <h3 style={{ marginBottom: 8 }}>Select MO(s)</h3>
                  <p className="text-muted">Choose one or more Manufacturing Orders from the left panel to start entering scrap data.</p>
                </div>
              </div>
            ) : (
              /* Selected MO Info */
              <div className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <GlassIcon name="plan" size={18} color="#dc2626" />
                      <div>
                        <h3 style={{ margin: 0 }}>Multiple MOs Selected ({selectedMOs.length})</h3>
                        <p className="text-muted text-sm">Components below represent the first selected MO for visual reference.</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted">Total QTY: <strong>{selectedMOs.reduce((s, m) => s + (m.qty || 0), 0).toLocaleString()}</strong></span>
                  </div>
                  <div className="card-body">
                    <p className="text-sm text-muted" style={{ marginBottom: 16 }}>Select a component below to enter Receive / Reject data:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                      {getCompCards().map(c => (
                        <div
                          key={c.comp}
                          onClick={() => openEntryModal(c.comp, c.name)}
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
                          <div style={{ fontSize: 11, background: c.color, color: '#fff', borderRadius: 20, padding: '2px 8px', display: 'inline-block' }}>
                            QTY: {(c.qty || 0).toLocaleString()}
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <span style={{ display: 'inline-block', background: '#fff', border: `1.5px solid ${c.color}`, color: c.color, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                              + Enter Data
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
                  {allSummaryComps.map(c => {
                    const s = summaryByComp[c] || { totalReceive: 0, totalReject: 0, count: 0 };
                    const col = COMP_COLORS[c] || '#6b7280';
                    return (
                      <div key={c} className="card" style={{ padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: col, marginBottom: 8 }}>{c}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ flex: 1, textAlign: 'center', background: '#f0fdf4', borderRadius: 8, padding: '6px 4px' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{s.totalReceive}</div>
                            <div style={{ fontSize: 10, color: '#6b7280' }}>RT</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center', background: '#fff1f2', borderRadius: 8, padding: '6px 4px' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{s.totalReject}</div>
                            <div style={{ fontSize: 10, color: '#6b7280' }}>RJ</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>{s.count} records</div>
                      </div>
                    );
                  })}
                </div>

              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GlassIcon name="history" size={16} color="#dc2626" />
                    <h3 style={{ margin: 0 }}>Scrap Records</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedScrapIds.length > 0 && (
                      <button className="btn btn-sm" onClick={handleBulkDeleteScrap} style={{ background: '#fca5a5', color: '#7f1d1d', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <GlassIcon name="delete" size={12} color="#7f1d1d" /> Delete Selected ({selectedScrapIds.length})
                      </button>
                    )}
                    <div style={{ position: 'relative', width: 180 }}>
                      <GlassIcon name="search" size={12} color="#9ca3af" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                      <input 
                        placeholder="Search MO..." 
                        value={scrapSearch} 
                        onChange={e => setScrapSearch(e.target.value)} 
                        style={{ paddingLeft: 26, fontSize: 12, width: '100%' }}
                      />
                    </div>
                    <select value={filterComp} onChange={e => setFilterComp(e.target.value)} style={{ width: 110, fontSize: 12 }}>
                      <option value="">All Parts</option>
                      {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {filterComp && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setFilterComp('')}>Clear Component</button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={loadScrap} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <GlassIcon name="search" size={12} color="#374151" /> Refresh
                    </button>
                  </div>
                </div>
                {scrLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
                ) : scrapEntries.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><GlassIcon name="folder" size={48} color="#9ca3af" /></div>
                    <p>No scrap records found.</p>
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: 800 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={scrapEntries.length > 0 && selectedScrapIds.length === scrapEntries.length}
                              onChange={e => {
                                if (e.target.checked) setSelectedScrapIds(scrapEntries.map(x => x.id));
                                else setSelectedScrapIds([]);
                              }}
                              style={{ cursor: 'pointer', accentColor: '#dc2626' }}
                            />
                          </th>
                          <th>MO Number</th>
                          <th>SKU</th>
                          <th>Component</th>
                          <th>Component Name</th>
                          <th style={{ color: '#16a34a' }}>Receive (RT)</th>
                          <th style={{ color: '#dc2626' }}>Reject (RJ)</th>
                          <th>Received At</th>
                          <th>Rejected At</th>
                          <th>Submitted By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scrapEntries.map(e => (
                            <tr key={e.id} style={{ background: selectedScrapIds.includes(e.id) ? '#fff1f2' : '' }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedScrapIds.includes(e.id)}
                                  onChange={() => {
                                    if (selectedScrapIds.includes(e.id)) setSelectedScrapIds(selectedScrapIds.filter(id => id !== e.id));
                                    else setSelectedScrapIds([...selectedScrapIds, e.id]);
                                  }}
                                  style={{ cursor: 'pointer', accentColor: '#dc2626' }}
                                />
                              </td>
                              <td style={{ fontWeight: 700, color: '#dc2626' }}>{e.moNumber}</td>
                              <td><span className="badge badge-primary">{e.sku}</span></td>
                              <td>
                                <span style={{ fontWeight: 600, color: e.component === 'Battery' ? '#2563eb' : e.component === 'PCBA' ? '#16a34a' : e.component === 'Coil' ? '#7c3aed' : '#d97706' }}>
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
                                <button className="btn-icon" title="Edit Record" onClick={() => openEditModal(e)}>
                                  <GlassIcon name="edit" size={18} color="#2563eb" />
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
        </div>
      </div>

      {/* Entry Modal */}
      {entryModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEntryModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="scrap" size={20} color="#dc2626" />
                  <h3 style={{ margin: 0 }}>Scrap Entry — {activeComp}</h3>
                </div>
                <button className="btn-icon" onClick={() => setEntryModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 600 }}>MOs: {selectedMOs.map(m => m.moNumber).join(', ')}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{activeComp}: <strong>{activeCompName}</strong></div>
                </div>
                {entryError && <div className="alert alert-danger" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {entryError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}><GlassIcon name="close" size={14} color="#dc2626" /> Reject (RJ)</label>
                    <input type="number" min="1" placeholder="Required > 0" value={rejQty} onChange={e => setRejQty(e.target.value)} style={{ borderColor: '#fca5a5' }} />
                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>Defective / rejected units</p>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}><GlassIcon name="success" size={14} color="#16a34a" /> Receive (RT)</label>
                    <input type="number" min="0" placeholder="Optional" value={recvQty} onChange={e => setRecvQty(e.target.value)} style={{ borderColor: '#86efac' }} />
                    <p className="text-xs text-muted" style={{ marginTop: 4 }}>Must be ≤ Reject Qty</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEntryModal(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={submitEntry}
                  disabled={submitting}
                  style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', border: 'none' }}
                >
                  {submitting ? 'Saving…' : <><GlassIcon name="success" size={14} color="#fff" /> Submit Scrap Entry</>}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Edit Scrap Modal */}
      {editModal && editingScrap && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEditModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GlassIcon name="edit" size={20} color="#2563eb" />
                  <h3 style={{ margin: 0 }}>Edit Scrap Record</h3>
                </div>
                <button className="btn-icon" onClick={() => setEditModal(false)}>✕</button>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>MO: {editingScrap.moNumber}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{editingScrap.component}: <strong>{editingScrap.componentName}</strong></div>
                </div>
                {entryError && <div className="alert alert-danger" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {entryError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}><GlassIcon name="close" size={14} color="#dc2626" /> Reject (RJ)</label>
                    <input type="number" min="1" placeholder="Required > 0" value={editRejQty} onChange={e => {
                      setEditRejQty(e.target.value);
                      if (!e.target.value || parseInt(e.target.value) <= 0) setEditRecvQty('');
                    }} style={{ borderColor: '#fca5a5' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#16a34a', fontWeight: 700 }}><GlassIcon name="success" size={14} color="#16a34a" /> Receive (RT)</label>
                    <input type="number" min="0" placeholder="Optional" value={editRecvQty} onChange={e => setEditRecvQty(e.target.value)} disabled={!editRejQty || parseInt(editRejQty) <= 0} style={{ borderColor: '#86efac', opacity: (!editRejQty || parseInt(editRejQty) <= 0) ? 0.5 : 1 }} title={(!editRejQty || parseInt(editRejQty) <= 0) ? "Cannot receive without rejecting" : ""} />
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
