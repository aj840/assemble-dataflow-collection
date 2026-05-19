import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

export default function DatabaseManager() {
  const [mos, setMos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [filterPlanDate, setFilterPlanDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });

  const [editModal, setEditModal] = useState(false);
  const [editingMO, setEditingMO] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (filterPlanDate) params.planDate = filterPlanDate;
      const data = await api.getMOs(params);
      setMos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterPlanDate]);

  useEffect(() => {
    const t = setTimeout(() => load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const filtered = mos.filter(m => {
    if (search) {
      const s = search.toLowerCase();
      if (!(m.moNumber || '').toLowerCase().includes(s) && !(m.sku || '').toLowerCase().includes(s)) return false;
    }
    if (filterPlanDate && (m.planDate || '') !== filterPlanDate) return false;
    return true;
  });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'date') {
       aVal = new Date(a.date || a.createdAt || 0).getTime();
       bVal = new Date(b.date || b.createdAt || 0).getTime();
    } else if (sortConfig.key === 'planDate') {
       aVal = new Date(a.planDate || 0).getTime();
       bVal = new Date(b.planDate || 0).getTime();
    } else if (sortConfig.key === 'qty') {
       aVal = a.qty || 0;
       bVal = b.qty || 0;
    } else {
       if (typeof aVal === 'string') aVal = aVal.toLowerCase();
       if (typeof bVal === 'string') bVal = bVal.toLowerCase();
       if (aVal === undefined) aVal = '';
       if (bVal === undefined) bVal = '';
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleExportCSV = () => {
    if (filtered.length === 0) return alert('No data to export.');
    const headers = ['ID', 'MO Number', 'SKU', 'Status', 'Date', 'Total QTY', 'Completed', 'Battery (Comp/Total)', 'PCBA (Comp/Total)', 'Coil (Comp/Total)', 'Shell (Comp/Total)', 'Lens (Comp/Total)'];
    const rows = filtered.map(m => [
      m.id, m.moNumber || '', m.sku || '', m.status || '', m.date || m.createdAt?.split('T')[0] || '',
      m.qty || 0, m.completedQty || 0,
      `${m.batteryComp || 0}/${m.batteryQty || 0}`,
      `${m.pcbaComp || 0}/${m.pcbaQty || 0}`,
      `${m.coilComp || 0}/${m.coilQty || 0}`,
      `${m.shellComp || 0}/${m.shellQty || 0}`,
      m.isProRing ? `${m.lensComp || 0}/${m.lensQty || 0}` : 'N/A',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `UltraHuman Assembly_DB_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackupDB = () => {
    window.open('http://localhost:5000/api/admin/backup', '_blank');
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this MO? This action cannot be undone.')) {
      try {
        await api.deleteMO(id);
        load();
      } catch (e) {
        console.error(e);
        alert('Failed to delete MO');
      }
    }
  };

  const handleEditClick = (mo) => {
    // Normalize refer: old records may have '' or undefined — treat as 'o' (0.2mm default)
    const normalizedRefer = ['s'].includes((mo.refer || '').toLowerCase().trim()) ? 's' : 'o';
    setEditingMO({ ...mo, refer: normalizedRefer });
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const safeRefer = editingMO.refer === 's' ? 's' : 'o';
      await api.updateMO(editingMO.id, {
        status: editingMO.status,
        completedQty: parseInt(editingMO.completedQty || 0),
        batteryComp: parseInt(editingMO.batteryComp || 0),
        pcbaComp:    parseInt(editingMO.pcbaComp    || 0),
        coilComp:    parseInt(editingMO.coilComp    || 0),
        shellComp:   parseInt(editingMO.shellComp   || 0),
        lensComp:    parseInt(editingMO.lensComp    || 0),
        planDate: editingMO.planDate || '',
        refer: safeRefer,
        submittedBy: 'Admin'
      });
      setEditModal(false);
      setEditingMO(null);
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to update MO data');
    }
  };

  // Live shell preview when admin changes OD in the modal
  const getShellPreview = (sku, refer) => {
    const skuUpper = (sku || '').toUpperCase().trim();
    const numMatch = skuUpper.match(/\d+$/);
    const num = numMatch ? numMatch[0] : '';
    const is02mm = ['o', '0'].includes((refer || '').toLowerCase().trim());
    const prefixMatch = skuUpper.match(/^[A-Z]+/);
    const lp = prefixMatch ? prefixMatch[0] : '';
    if (lp === 'LR') return `RARE ROSE GOLD SHELL RS${num}`;
    if (lp === 'LP') return `RARE PLATINUM SHELL S${num}`;
    if (lp === 'LG') return `RARE YELLOW GOLD SHELL LG${num}`;
    if (lp === 'DS') return `DIESEL SILVER SHELL DS${num}`;
    if (lp === 'DB') return `DIESEL BLACK SHELL DB${num}`;
    if (lp === 'BRG') return `Brushed Rose gold 0.2MM - SIZE ${num}`;
    return is02mm ? (num ? `0.2mm ${skuUpper}` : skuUpper) : skuUpper;
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Database Manager</h2>
          <p className="text-muted text-sm">Full administrative control over MO database records.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleBackupDB}><GlassIcon name="database" size={16} color="#64748b" /> Backup Full DB</button>
          <button className="btn btn-success btn-sm" onClick={handleExportCSV}><GlassIcon name="export" size={16} color="#ffffff" /> Export Excel</button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', background: '#f9fafb' }}>
        <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: 200 }} max={today + 'T23:59'} />
        <span className="text-muted">to</span>
        <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: 200 }} max={today + 'T23:59'} />
        {(startDate || endDate) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear</button>
        )}
        {/* Plan Date Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 8, padding: '5px 12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#2563eb', whiteSpace: 'nowrap' }}><GlassIcon name="history" size={14} /> Plan Date:</span>
          <input
            type="date"
            value={filterPlanDate}
            onChange={e => setFilterPlanDate(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#1e40af', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            title="Filter by Plan Date"
          />
          {filterPlanDate && (
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, padding: 0, lineHeight: 1 }}
              onClick={() => setFilterPlanDate('')}
              title="Clear plan date filter"
            >×</button>
          )}
        </div>
        <div className="search-input-wrap" style={{ marginLeft: 'auto', flex: 1, maxWidth: 300 }}>
          <span className="search-icon"><GlassIcon name="audit" size={16} color="#94a3b8" /></span>
          <input placeholder="Search MO Number or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('moNumber')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  MO Number {sortConfig.key === 'moNumber' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('sku')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  SKU {sortConfig.key === 'sku' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('refer')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  OD {sortConfig.key === 'refer' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Created Date {sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('planDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Plan Date {sortConfig.key === 'planDate' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => handleSort('qty')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Quantities (Completed / Total) {sortConfig.key === 'qty' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></td></tr>
              ) : sortedFiltered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="icon">🗄️</div>
                    <p>No records found in database.</p>
                  </div>
                </td></tr>
              ) : (
                sortedFiltered.map(mo => (
                  <tr key={mo.id}>
                    <td style={{ fontWeight: 600, color: '#111827' }}>{mo.moNumber || '—'}</td>
                    <td><span className="badge badge-primary">{mo.sku}</span></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
                        background: ['o','0'].includes((mo.refer||'').toLowerCase()) ? '#eff6ff' : '#fffbeb',
                        color:     ['o','0'].includes((mo.refer||'').toLowerCase()) ? '#2563eb'  : '#d97706',
                        border:    `1px solid ${['o','0'].includes((mo.refer||'').toLowerCase()) ? '#bfdbfe' : '#fcd34d'}`,
                        whiteSpace: 'nowrap'
                      }}>
                        {['o','0'].includes((mo.refer||'').toLowerCase()) ? '⬜ O (0.2mm)' : '🟨 S (0.3mm)'}
                      </span>
                    </td>
                    <td className="text-sm">{mo.date || mo.createdAt?.split('T')[0]}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                          <GlassIcon name="history" size={12} color="#2563eb" /> {mo.planDate || '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${mo.status === 'Completed' ? 'success' : 'warning'}`}>
                        {mo.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: '#f3f4f6', borderRadius: 4 }}>
                          <span style={{ fontWeight: 600 }}>Overall MO:</span>
                          <span style={{ color: mo.completedQty >= mo.qty ? '#16a34a' : '#2563eb', fontWeight: 600 }}>
                            {mo.completedQty || 0} / {mo.qty}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <div style={{ flex: 1, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                            <span className="text-muted">Battery:</span> <span style={{ color: mo.batteryComp >= mo.batteryQty ? '#16a34a' : '#2563eb', fontWeight: 600 }}>{mo.batteryComp || 0} / {mo.batteryQty}</span>
                          </div>
                          <div style={{ flex: 1, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4 }}>
                            <span className="text-muted">PCBA:</span> <span style={{ color: mo.pcbaComp >= mo.pcbaQty ? '#16a34a' : '#2563eb', fontWeight: 600 }}>{mo.pcbaComp || 0} / {mo.pcbaQty}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn-icon" title="Edit Record" onClick={() => handleEditClick(mo)}>
                          <GlassIcon name="edit" size={18} color="#2563eb" />
                        </button>
                        <button className="btn-icon danger" title="Delete Record" onClick={() => handleDelete(mo.id)}>
                          <GlassIcon name="delete" size={18} color="#dc2626" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
          <span className="text-sm text-muted">Showing {sortedFiltered.length} DB Records</span>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal && editingMO && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setEditModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
              <div className="modal-header">
                <h3>Database Edit: {editingMO.moNumber || editingMO.sku}</h3>
                <button className="btn-icon" onClick={() => setEditModal(false)}>✕</button>
              </div>

              {/* OD Selector — two clickable cards */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 8, display: 'block' }}>
                  OD — Shell Thickness
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {/* O card */}
                  <button
                    type="button"
                    onClick={() => setEditingMO({ ...editingMO, refer: 'o' })}
                    style={{
                      padding: '16px 12px',
                      borderRadius: 10,
                      border: editingMO.refer === 'o' ? '2.5px solid #2563eb' : '2px solid #e5e7eb',
                      background: editingMO.refer === 'o' ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#f9fafb',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      textAlign: 'left',
                      boxShadow: editingMO.refer === 'o' ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: editingMO.refer === 'o' ? '#2563eb' : '#d1d5db',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0
                      }}>O</div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: editingMO.refer === 'o' ? '#1e40af' : '#4b5563' }}>0.2mm Shell</span>
                      {editingMO.refer === 'o' && <span style={{ marginLeft: 'auto', fontSize: 11, background: '#2563eb', color: '#fff', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>✓ Selected</span>}
                    </div>
                    <p style={{ fontSize: 11, color: editingMO.refer === 'o' ? '#3b82f6' : '#9ca3af', margin: 0 }}>
                      Thinner shell — shell name gets <strong>0.2mm</strong> prefix
                    </p>
                  </button>

                  {/* S card */}
                  <button
                    type="button"
                    onClick={() => setEditingMO({ ...editingMO, refer: 's' })}
                    style={{
                      padding: '16px 12px',
                      borderRadius: 10,
                      border: editingMO.refer === 's' ? '2.5px solid #d97706' : '2px solid #e5e7eb',
                      background: editingMO.refer === 's' ? 'linear-gradient(135deg, #fffbeb, #fef3c7)' : '#f9fafb',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      textAlign: 'left',
                      boxShadow: editingMO.refer === 's' ? '0 4px 12px rgba(217,119,6,0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: editingMO.refer === 's' ? '#d97706' : '#d1d5db',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0
                      }}>S</div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: editingMO.refer === 's' ? '#92400e' : '#4b5563' }}>Standard Shell</span>
                      {editingMO.refer === 's' && <span style={{ marginLeft: 'auto', fontSize: 11, background: '#d97706', color: '#fff', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>✓ Selected</span>}
                    </div>
                    <p style={{ fontSize: 11, color: editingMO.refer === 's' ? '#d97706' : '#9ca3af', margin: 0 }}>
                      Standard shell — shell name uses <strong>no prefix</strong>
                    </p>
                  </button>
                </div>
                <p className="text-xs text-muted" style={{ marginTop: 8 }}>
                  Changing OD updates shell name and cascades to User Dashboard &amp; WIP Report.
                </p>
              </div>

              {/* Shell preview */}
              <div style={{ marginBottom: 16, padding: '10px 16px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#15803d', whiteSpace: 'nowrap' }}><GlassIcon name="refresh" size={14} color="#15803d" /> Shell Preview:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                  {getShellPreview(editingMO.sku, editingMO.refer)}
                </span>
                {getShellPreview(editingMO.sku, editingMO.refer) !== editingMO.shell && (
                  <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, marginLeft: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><GlassIcon name="warning" size={14} color="#b45309" /> Will change from: "{editingMO.shell}"</div>
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label>Status</label>
                  <select value={editingMO.status} onChange={e => setEditingMO({...editingMO, status: e.target.value})}>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Overall Completed Qty</label>
                  <input type="number" min="0" value={editingMO.completedQty} onChange={e => setEditingMO({...editingMO, completedQty: e.target.value})} />
                </div>
              </div>

              {/* Plan Date edit */}
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="history" size={14} color="#2563eb" /> Plan Date</label>
                <input
                  type="date"
                  value={editingMO.planDate || ''}
                  onChange={e => setEditingMO({...editingMO, planDate: e.target.value})}
                  style={{ maxWidth: 220 }}
                />
                <p className="text-xs text-muted" style={{ marginTop: 4 }}>The manufacturing plan date for this order.</p>
              </div>

              <div style={{ padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12, color: '#374151' }}>Component Completed Quantities</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Battery</label>
                    <input type="number" min="0" value={editingMO.batteryComp} onChange={e => setEditingMO({...editingMO, batteryComp: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>PCBA</label>
                    <input type="number" min="0" value={editingMO.pcbaComp} onChange={e => setEditingMO({...editingMO, pcbaComp: e.target.value})} />
                  </div>
                  {!editingMO.isProRing && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Coil</label>
                      <input type="number" min="0" value={editingMO.coilComp} onChange={e => setEditingMO({...editingMO, coilComp: e.target.value})} />
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Shell</label>
                    <input type="number" min="0" value={editingMO.shellComp} onChange={e => setEditingMO({...editingMO, shellComp: e.target.value})} />
                  </div>
                  {editingMO.isProRing && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ color: '#e67e22', fontWeight: 700 }}>🔬 Lens <span style={{ fontSize: 11, color: '#9ca3af' }}>(Pro Ring)</span></label>
                      <input type="number" min="0" value={editingMO.lensComp || 0} onChange={e => setEditingMO({...editingMO, lensComp: e.target.value})} style={{ borderColor: '#e67e22' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="alert alert-warning">
                <div style={{ display: 'flex', gap: 6 }}><GlassIcon name="alert" size={14} color="#b45309" /> <span>Admin override: Changes made here bypass standard validation and directly update the database record.</span></div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveEdit} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="save" size={14} color="#fff" /> Save to Database</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
