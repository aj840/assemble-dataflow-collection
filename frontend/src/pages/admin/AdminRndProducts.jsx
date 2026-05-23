import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import GlassIcon from '../../components/GlassIcon';
import { api } from '../../services/api';

/* ─── tiny modal backdrop ─────────────────────────────────────────── */
const Overlay = ({ children, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }}
  >
    <div onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

export default function AdminRndProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ code: '', description: '', category: '' });
  const [error, setError] = useState('');

  /* edit modal state */
  const [editTarget, setEditTarget] = useState(null);   // product being edited
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchProducts = async () => {
    try {
      const data = await api.getRndProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  /* ── add ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createRndProduct(form);
      setForm({ code: '', description: '', category: '' });
      fetchProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await api.deleteRndProduct(id);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  /* ── open edit modal ── */
  const openEdit = (p) => {
    setEditTarget(p);
    setEditForm({ code: p.code, description: p.description, category: p.category, status: p.status || 'Active' });
    setEditError('');
  };

  /* ── save edit ── */
  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      await api.updateRndProduct(editTarget.id, { ...editForm, updatedBy: user?.fullName || 'Admin' });
      setEditTarget(null);
      fetchProducts();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const labelStyle = {
    display: 'block', marginBottom: 6, fontWeight: 600,
    fontSize: '0.78rem', letterSpacing: '0.04em',
    textTransform: 'uppercase', color: '#6b7280',
  };

  if (isLoading) return <div style={{ padding: 24 }}>Loading R&D products…</div>;

  return (
    <div className="admin-view" style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>R&D Products</h2>
        <p className="text-muted">Manage products available in the R&D module.</p>
      </div>

      {/* ── Add form ── */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Add New Product</h3>
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 12, alignItems: 'end' }}
        >
          <div>
            <label style={labelStyle}>Product Code</label>
            <input type="text" className="input-field" placeholder="e.g. RD-001"
              value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input type="text" className="input-field" placeholder="e.g. Experimental Core"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <input type="text" className="input-field" placeholder="e.g. Hardware"
              value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: 38 }}>Add</button>
        </form>
      </div>

      {/* ── Products table ── */}
      <div className="card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 16 }}>Existing Products ({products.length})</h3>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Category</th>
                <th>Status</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ opacity: p.status === 'Inactive' ? 0.6 : 1 }}>
                  <td><span className="badge badge-info">{p.code}</span></td>
                  <td>{p.description}</td>
                  <td>{p.category}</td>
                  <td>
                    <span style={{
                      background: p.status === 'Active' ? '#f0fdf4' : '#f3f4f6',
                      color: p.status === 'Active' ? '#16a34a' : '#9ca3af',
                      padding: '2px 10px', borderRadius: 20,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {p.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn-icon"
                      title="Edit"
                      onClick={() => openEdit(p)}
                    >
                      <GlassIcon name="settings" size={16} color="#2563eb" />
                    </button>
                    <button
                      className="btn-icon"
                      title="Delete"
                      onClick={() => handleDelete(p.id)}
                    >
                      <GlassIcon name="trash" size={16} color="#ef4444" />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                    No products found. Create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <Overlay onClose={() => setEditTarget(null)}>
          <div className="card" style={{
            width: 480, padding: 32, borderRadius: 16,
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0 }}>Edit Product</h3>
              <button
                onClick={() => setEditTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            {editError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{editError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Product Code</label>
                <input type="text" className="input-field"
                  value={editForm.code}
                  onChange={e => setEditForm({ ...editForm, code: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input type="text" className="input-field"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <input type="text" className="input-field"
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })} />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {['Active', 'Inactive'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: s })}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                        border: `2px solid ${editForm.status === s ? (s === 'Active' ? '#16a34a' : '#9ca3af') : '#e5e7eb'}`,
                        background: editForm.status === s ? (s === 'Active' ? '#f0fdf4' : '#f3f4f6') : '#fff',
                        color: editForm.status === s ? (s === 'Active' ? '#16a34a' : '#6b7280') : '#9ca3af',
                        fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                      }}
                    >
                      {s === 'Active' ? '✅ Active' : '⬛ Inactive'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving} style={{ minWidth: 110 }}>
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}
