import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import GlassIcon from '../../components/GlassIcon';
import ModalPortal from '../../components/ModalPortal';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ employeeId: '', password: '', fullName: '', role: 'user' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    try { setUsers(await api.getUsers()); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ employeeId: '', password: '', fullName: '', role: 'user' }); setEditUser(null); setError(''); setShowModal(true); };
  const openEdit = (u) => { setForm({ employeeId: u.employeeId, password: '', fullName: u.fullName, role: u.role }); setEditUser(u); setError(''); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editUser) {
        await api.updateUser(editUser.id, { fullName: form.fullName, role: form.role, ...(form.password ? { password: form.password } : {}) });
        setSuccess('User updated successfully.');
      } else {
        await api.createUser(form);
        setSuccess('User created successfully.');
      }
      setShowModal(false);
      load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    try { await api.deleteUser(id); load(); } catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (u) => {
    try { await api.updateUser(u.id, { status: u.status === 'Active' ? 'Inactive' : 'Active' }); load(); } catch (e) { console.error(e); }
  };

  const filtered = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.employeeId?.toLowerCase().includes(search.toLowerCase())
  );

  const active = users.filter(u => u.status === 'Active');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>User Management</h2>
          <p className="text-muted text-sm">Manage system access, roles, and employee permissions.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-sm">📥 Export</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Create User</button>
        </div>
      </div>

      {success && <div className="alert alert-success" style={{ marginBottom: 16 }} onClick={() => setSuccess('')}><GlassIcon name="document" size={16} color="#16a34a" style={{ marginRight: 8 }} /> {success}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: users.length, icon: 'users', color: '#2563eb' },
          { label: 'Active Now', value: active.length, icon: 'document', color: '#16a34a' },
          { label: 'Admin Roles', value: admins.length, icon: 'shield', color: '#7c3aed' },
          { label: 'Inactive', value: users.length - active.length, icon: 'history', color: '#6b7280' },
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

      {/* Table card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="search-input-wrap" style={{ width: 280 }}>
            <span className="search-icon"><GlassIcon name="audit" size={16} color="#94a3b8" /></span>
            <input placeholder="Search by Employee ID or Name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={{ width: 140 }}>
            <option>All Roles</option>
            <option>Admin</option>
            <option>User</option>
          </select>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}><span className="spinner" style={{ display: 'inline-block' }} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 32 }}>No users found.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td style={{ color: '#2563eb', fontWeight: 600 }}>{u.employeeId}</td>
                  <td style={{ fontWeight: 500 }}>{u.fullName}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-gray'}`}>
                      <GlassIcon name={u.role === 'admin' ? 'shield' : 'users'} size={14} color={u.role === 'admin' ? '#2563eb' : '#6b7280'} style={{ marginRight: 4 }} />
                      {u.role === 'admin' ? 'Admin' : 'Data Entry'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td className="text-sm text-muted">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <div className="td-actions">
                      <button className="btn-icon" onClick={() => openEdit(u)} title="Edit">
                        <GlassIcon name="edit" size={18} color="#2563eb" />
                      </button>
                      <button className="btn-icon" onClick={() => handleToggleStatus(u)} title={u.status === 'Active' ? 'Deactivate' : 'Activate'}>
                        <GlassIcon name={u.status === 'Active' ? 'history' : 'dashboard'} size={18} color="#6b7280" />
                      </button>
                      {u.employeeId !== 'UltraAss' && (
                        <button className="btn-icon danger" onClick={() => handleDelete(u.id, u.fullName)} title="Delete">
                          <GlassIcon name="delete" size={18} color="#dc2626" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6' }}>
          <span className="text-sm text-muted">Showing {filtered.length} of {users.length} users</span>
        </div>
      </div>

      {/* Security notice */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
        <div className="card" style={{ padding: '20px 24px' }}>
          <h4 style={{ marginBottom: 8 }}>🔒 Security Notice</h4>
          <p className="text-sm text-muted">Administrators are responsible for maintaining the principle of least privilege. Ensure temporary passwords are changed within 24 hours of user creation. Inactive users will be purged after 90 days.</p>
        </div>
        <div className="card" style={{ padding: '20px 24px' }}>
          <h4 style={{ marginBottom: 10 }}>🕐 Recent Modifications</h4>
          <p className="text-sm text-muted">No recent modifications recorded.</p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editUser ? `Edit User: ${editUser.employeeId}` : 'Create New User'}</h3>
                <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
                </div>
                {!editUser && (
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required />
                  </div>
                )}
                <div className="form-group">
                  <label>{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!editUser} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="user">Data Entry (User)</option>
                    <option value="admin">Administrator (Admin)</option>
                  </select>
                </div>
                {error && <div className="alert alert-danger" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><GlassIcon name="alert" size={16} /> {error}</div>}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
