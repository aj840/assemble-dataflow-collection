import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

export default function AdminDBManager() {
  const [activeTab, setActiveTab] = useState('mo'); // 'mo', 'scrap', 'return'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let res = [];
      if (activeTab === 'mo') {
        // KEY FIX: use status=all so Returned MOs are included and visible/deletable
        res = await api.getMOs({ status: 'all' });
      } else if (activeTab === 'scrap') {
        res = await api.getScrap();
      } else if (activeTab === 'return') {
        res = await api.getReturns();
      } else if (activeTab === 'rework') {
        res = await api.getRework();
      }
      setData(res);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const t = setTimeout(() => loadData(), 0);
    return () => clearTimeout(t);
  }, [loadData]);

  const filteredData = data.filter(item => {
    if (searchTerm && !(item.moNumber || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (startDate || endDate) {
      const dStr = item.createdAt || item.returnedAt || item.submittedAt;
      if (!dStr) return false;
      
      const itemDateObj = new Date(dStr);
      if (isNaN(itemDateObj.getTime())) return false;
      
      const yyyy = itemDateObj.getFullYear();
      const mm = String(itemDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(itemDateObj.getDate()).padStart(2, '0');
      const itemDateStr = `${yyyy}-${mm}-${dd}`;
      
      if (startDate && itemDateStr < startDate) return false;
      if (endDate && itemDateStr > endDate) return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length && filteredData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map(item => item.id));
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    const confirmMsg = action === 'trash'
      ? `Move ${selectedIds.length} items to Trash?`
      : `PERMANENTLY DELETE ${selectedIds.length} items? This cannot be undone.`;

    if (!window.confirm(confirmMsg)) return;

    setProcessing(true);
    try {
      await api.bulkDbAction({ action, type: activeTab, ids: selectedIds });
      await loadData();
    } catch (e) {
      alert('Action failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleWipeAll = async () => {
    const first = window.confirm(
      'NUCLEAR RESET\n\nThis will permanently delete ALL:\n• MO Entries (including Returned)\n• Scrap Entries\n• Return Entries\n• Trash Entries\n\nThis CANNOT be undone. Continue?'
    );
    if (!first) return;

    const second = window.confirm(
      'FINAL CONFIRMATION\n\nAre you absolutely sure you want to wipe ALL production data?\n\nType OK to confirm.'
    );
    if (!second) return;

    setWiping(true);
    try {
      const result = await api.wipeAll({ confirm: 'WIPE_ALL_CONFIRMED', submittedBy: 'Admin' });
      alert(
        `Database wiped successfully!\n\nDeleted:\n• ${result.deleted.mo} MOs\n• ${result.deleted.scrap} Scrap entries\n• ${result.deleted.rework} Rework entries\n• ${result.deleted.returns} Return entries\n• ${result.deleted.trash} Trash entries`
      );
      await loadData();
    } catch (e) {
      alert('Wipe failed: ' + e.message);
    } finally {
      setWiping(false);
    }
  };

  // Status badge colour helper
  const statusBadge = (status) => {
    const map = {
      Completed: 'badge-success',
      Replenished: 'badge-success',
      Pending: 'badge-warning',
      Returned: 'badge-danger',
    };
    return map[status] || 'badge-primary';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>DB Manager</h2>
          <p className="text-muted text-sm">Bulk manage ALL database records — including Returned MOs. Move to Trash or permanently delete.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <GlassIcon name="search" size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search MO Number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '6px 12px 6px 30px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: 200 }}
            />
          </div>
          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: 6 }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#4b5563', outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#4b5563', outline: 'none' }}
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '0 4px' }}
                title="Clear dates"
              >×</button>
            )}
          </div>
          {/* Nuclear wipe button */}
          <button
            onClick={handleWipeAll}
            disabled={wiping}
            style={{
              padding: '8px 16px', borderRadius: 8, border: '2px solid #dc2626',
              background: wiping ? '#fef2f2' : 'linear-gradient(135deg,#fee2e2,#fef2f2)',
              color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: wiping ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
            }}
            title="Permanently wipe ALL data from all tables"
          >
            {wiping ? (
              <><span className="spinner" style={{ display: 'inline-block', width: 14, height: 14, borderWidth: 2, borderColor: '#dc2626', borderRightColor: 'transparent' }} /> Wiping...</>
            ) : (
              <><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="warning" size={14} /> Wipe All Data</div></>
            )}
          </button>
        </div>
      </div>

      {/* Info banner about Returned MOs */}
      <div style={{
        padding: '10px 16px', marginBottom: 16, borderRadius: 8,
        background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
        border: '1px solid #fcd34d',
        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13
      }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><GlassIcon name="alert" size={24} color="#2563eb" /></span>
        <span style={{ color: '#92400e', fontWeight: 600 }}>
          DB Manager shows ALL records including <span style={{ background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>Returned</span> MOs which are hidden from normal views but still counted in WIP calculations.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #e5e7eb', paddingBottom: 10 }}>
        {[
          { id: 'mo',     label: 'Plan Data (MOs)', icon: 'plan'    },
          { id: 'scrap',  label: 'Scrap Data',      icon: 'scrap'   },
          { id: 'rework', label: 'Rework Data',      icon: 'history' },
          { id: 'return', label: 'Return Data',      icon: 'history' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 16px', border: 'none',
              background: activeTab === t.id ? '#2563eb' : 'transparent',
              color: activeTab === t.id ? '#fff' : '#6b7280',
              fontWeight: 600, borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
            }}
          >
            <GlassIcon name={t.icon} size={16} color={activeTab === t.id ? '#fff' : '#6b7280'} />
            {t.label}
            <span style={{
              background: activeTab === t.id ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
              color: activeTab === t.id ? '#fff' : '#6b7280',
              borderRadius: 12, padding: '1px 8px', fontSize: 11, fontWeight: 700,
            }}>
              {t.id === activeTab ? data.length : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="card animate-fade" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontWeight: 600, color: '#1e40af' }}>
            {selectedIds.length} of {filteredData.length} items selected
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedIds([])}
              style={{ color: '#6b7280' }}
            >
              Deselect All
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleBulkAction('trash')}
              disabled={processing}
              style={{ color: '#d97706', borderColor: '#fcd34d', background: '#fffbeb' }}
            >
              {processing ? 'Processing...' : '🗑 Move to Trash'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleBulkAction('delete')}
              disabled={processing}
              style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
            >
              {processing ? 'Processing...' : '⚠ Delete Permanently'}
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card table-wrapper">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No records found{data.length > 0 ? ' matching your filters' : ` in ${activeTab.toUpperCase()}`}.</p>
            {data.length === 0 && <p style={{ color: '#16a34a', fontWeight: 600, marginTop: 8 }}>✓ This collection is empty — database is clean.</p>}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredData.length && filteredData.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
                  />
                </th>
                <th>MO Number / ID</th>
                <th>SKU / Type</th>
                <th>Status</th>
                <th>QTY</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr
                  key={item.id}
                  style={{ background: selectedIds.includes(item.id) ? '#eff6ff' : item.status === 'Returned' ? '#fef2f2' : 'transparent' }}
                >
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#2563eb' }}
                    />
                  </td>
                  <td style={{ fontWeight: 600, color: item.status === 'Returned' ? '#dc2626' : '#111827' }}>
                    {item.moNumber || item.id?.slice(0, 8) || '—'}
                    {item.status === 'Returned' && (
                      <span style={{ marginLeft: 8, fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                        RETURNED
                      </span>
                    )}
                  </td>
                  <td>
                    {item.sku
                      ? <span className="badge badge-primary">{item.sku}</span>
                      : <span className="badge badge-secondary">{item.isFullMO ? 'Full MO' : (item.component || 'Component')}</span>
                    }
                  </td>
                  <td>
                    {item.status ? (
                      <span className={`badge ${statusBadge(item.status)}`}>{item.status}</span>
                    ) : (
                      <span className="badge badge-primary">{item.component || '—'}</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {item.qty ? item.qty.toLocaleString() : (item.receive != null ? `RC:${item.receive} RJ:${item.reject}` : (item.componentQty || '—'))}
                  </td>
                  <td style={{ fontSize: 12, color: '#6b7280' }}>
                    {new Date(item.createdAt || item.returnedAt || item.submittedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filteredData.length > 0 && (
          <div style={{ padding: '10px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-sm text-muted">
              Showing {filteredData.length} records
              {activeTab === 'mo' && data.filter(m => m.status === 'Returned').length > 0 && (
                <span style={{ marginLeft: 12, color: '#dc2626', fontWeight: 600 }}>
                  ⚠ {data.filter(m => m.status === 'Returned').length} Returned MO(s) included
                </span>
              )}
            </span>
            {selectedIds.length > 0 && (
              <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>
                {selectedIds.length} selected
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
