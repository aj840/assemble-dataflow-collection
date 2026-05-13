import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

const TABS = ['Battery Types', 'PCBA Versions', 'Coil Types', 'Shell Types', 'Lens Types'];
const CATEGORIES = ['batteries', 'pcbas', 'coils', 'shells', 'lenses'];

export default function ComponentTypes() {
  const [activeTab, setActiveTab] = useState(0);
  const [components, setComponents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState(false);
  const [action, setAction] = useState('add'); // 'add' | 'edit' | 'delete'
  const [activeItem, setActiveItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getComponents().then(setComponents).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openModal = (act, item = null) => {
    setAction(act);
    setActiveItem(item);
    if (item) {
      setEditName(item.name);
      setEditStatus(item.status || 'Active');
    } else {
      setEditName('');
      setEditStatus('Active');
    }
    setModal(true);
  };

  const handleManage = async () => {
    if ((action === 'add' || action === 'edit') && !editName) return alert('Name is required');
    setSaving(true);
    try {
      const category = CATEGORIES[activeTab];
      await api.manageComponent({
        category,
        action,
        id: activeItem?.id,
        name: editName,
        status: editStatus
      });
      setModal(false);
      load();
    } catch (e) {
      alert(e.message || 'Failed to update component');
    } finally {
      setSaving(false);
    }
  };

  const getList = () => {
    if (!components) return [];
    switch (activeTab) {
      case 0: return components.batteries || [];
      case 1: return components.pcbas || [];
      case 2: return components.coils || [];
      case 3: return (components.shells || []).map((s, i) => ({ id: `S-${i}`, name: s, status: 'Active', updatedAt: '2024-03-01' }));
      case 4: return components.lenses || [];
      default: return [];
    }
  };

  const getTabLabel = () => TABS[activeTab];
  const list = getList().filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  const counts = components ? [components.batteries?.length, components.pcbas?.length, components.coils?.length, components.shells?.length, components.lenses?.length] : [0, 0, 0, 0, 0];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 4 }}>Component Types Management</h2>
        <p className="text-muted text-sm">Define and configure the core components used in manufacturing processes and SKU auto-parsing rules.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Batteries', value: counts[0] || 0, icon: 'document', color: '#2563eb' },
          { label: 'Active PCBAs', value: counts[1] || 0, icon: 'settings', color: '#7c3aed' },
          { label: 'Coil Variants', value: counts[2] || 0, icon: 'audit', color: '#d97706' },
          { label: 'Shell Materials', value: counts[3] || 0, icon: 'shield', color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="card stat-card" style={{ padding: '24px 20px' }}>
            <div className="stat-label">
              <GlassIcon name={s.icon} size={22} color={s.color} style={{ marginRight: 8 }} />
              {s.label}
            </div>
            <div className="stat-value" style={{ color: s.color, marginTop: 12, fontSize: '2.5rem' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Header */}
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Component Catalog</h3>
            <p className="text-sm text-muted">Select a category below to manage its specific component versions.</p>
          </div>
          <span className="badge badge-gray">v2.4.0-STABLE</span>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px' }}>
          <div className="tabs">
            {TABS.map((t, i) => (
              <div key={t} className={`tab ${activeTab === i ? 'active' : ''}`} onClick={() => { setActiveTab(i); setSearch(''); }}>
                <GlassIcon name={['document', 'settings', 'audit', 'shield'][i]} size={16} color={activeTab === i ? '#2563eb' : '#94a3b8'} style={{ marginRight: 8 }} />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="card-body">
          {/* Sub header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0 }}>{getTabLabel()} Management</h3>
              <p className="text-sm text-muted">Configure component versions and availability.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={() => openModal('add')}>
                + Add New {getTabLabel().split(' ')[0]}
              </button>
              <div className="search-input-wrap">
                <span className="search-icon"><GlassIcon name="audit" size={16} color="#94a3b8" /></span>
                <input
                  placeholder={`Search ${getTabLabel()}...`}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: 220 }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ display: 'inline-block' }} /></div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    {activeTab < 3 && <th>Last Updated</th>}
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 32 }}>No items found.</td></tr>
                  ) : list.map(item => (
                    <tr key={item.id}>
                      <td style={{ color: '#2563eb', fontWeight: 600, fontSize: 12 }}>{item.id}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      {activeTab < 3 && <td className="text-sm text-muted">{item.updatedAt || '—'}</td>}
                      <td><span className={`badge ${item.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{item.status}</span></td>
                      <td>
                        <div className="td-actions">
                          <button className="btn-icon" title="Edit" onClick={() => openModal('edit', item)}>
                            <GlassIcon name="edit" size={18} color="#2563eb" />
                          </button>
                          <button className="btn-icon danger" title="Delete" onClick={() => openModal('delete', item)}>
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

        {/* Notice */}
        <div style={{ margin: '0 24px 24px', padding: '12px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', display: 'flex', gap: 10 }}>
          <GlassIcon name="audit" size={20} color="#2563eb" />
          <div>
            <strong style={{ fontSize: 13, color: '#1e40af' }}>Administrator Notice</strong>
            <p className="text-sm" style={{ color: '#1e40af', marginTop: 2 }}>Deactivating a component will prevent it from being selected in new production plans, but existing plans will retain their history.</p>
          </div>
        </div>
      </div>

      {/* Manage Modal */}
      {modal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
              <div className="modal-header">
                <h3>
                  {action === 'add' ? `Add ${getTabLabel().split(' ')[0]}` : action === 'edit' ? 'Edit Component' : 'Confirm Delete'}
                </h3>
                <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                {action === 'delete' ? (
                  <div className="alert alert-danger">
                    <p style={{ margin: 0 }}>Are you sure you want to delete <strong>{activeItem?.name}</strong>?</p>
                    <p style={{ margin: '8px 0 0', fontSize: 12 }}>This action cannot be undone.</p>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Name</label>
                      <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
                    </div>
                    {activeTab < 3 && (
                      <div className="form-group">
                        <label>Status</label>
                        <select value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                          <option value="Active">Active</option>
                          <option value="Disabled">Disabled</option>
                        </select>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button 
                  className={`btn ${action === 'delete' ? 'btn-danger' : 'btn-primary'}`} 
                  onClick={handleManage}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : action === 'delete' ? 'Delete' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
