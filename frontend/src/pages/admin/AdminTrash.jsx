import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';

export default function AdminTrash() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTrash();
      setData(res);
      setSelectedIds([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadData(), 0);
    return () => clearTimeout(t);
  }, [loadData]);

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map(item => item.id));
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
    const confirmMsg = action === 'delete' 
      ? `PERMANENTLY DELETE ${selectedIds.length} items from Trash? This cannot be undone.`
      : `Restore ${selectedIds.length} items to their original locations?`;
      
    if (!window.confirm(confirmMsg)) return;

    setProcessing(true);
    try {
      await api.bulkTrashAction({ action, ids: selectedIds });
      await loadData();
    } catch (e) {
      alert('Action failed: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GlassIcon name="delete" size={24} color="#dc2626" /> Trash Bin
          </h2>
          <p className="text-muted text-sm">Review deleted items. Items here can be permanently deleted or restored.</p>
        </div>
      </div>

      {/* Action Bar */}
      {selectedIds.length > 0 && (
        <div className="card animate-fade" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <div style={{ fontWeight: 600, color: '#991b1b' }}>
            {selectedIds.length} items selected
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={() => handleBulkAction('restore')}
              disabled={processing}
              style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
            >
              Restore Selected
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => handleBulkAction('delete')}
              disabled={processing}
              style={{ background: '#dc2626', border: 'none' }}
            >
              Delete Permanently
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card table-wrapper">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
        ) : data.length === 0 ? (
          <div className="empty-state"><div className="icon">✨</div><p>Trash is empty.</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === data.length && data.length > 0} 
                    onChange={toggleSelectAll} 
                  />
                </th>
                <th>Original Source</th>
                <th>MO Number</th>
                <th>Details</th>
                <th>Trashed At</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => {
                let sourceBadgeClass = 'badge-primary';
                if (item.originalSource === 'scrap') sourceBadgeClass = 'badge-warning';
                if (item.originalSource === 'return') sourceBadgeClass = 'badge-danger';

                return (
                  <tr key={item.id} style={{ background: selectedIds.includes(item.id) ? '#fef2f2' : 'transparent', opacity: selectedIds.includes(item.id) ? 1 : 0.8 }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(item.id)} 
                        onChange={() => toggleSelect(item.id)} 
                      />
                    </td>
                    <td>
                      <span className={`badge ${sourceBadgeClass}`} style={{ textTransform: 'uppercase' }}>
                        {item.originalSource}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#111827' }}>
                      {item.moNumber || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: '#4b5563' }}>
                      {item.sku && `SKU: ${item.sku} | `}
                      {item.component && `Comp: ${item.component} | `}
                      {item.qty && `Qty: ${item.qty}`}
                    </td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(item.trashedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
